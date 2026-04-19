import { CurrencyEnum } from '@expenses/api';
import { TRPCError } from '@trpc/server';
import { createAuthenticatedCaller, createPublicCaller, seedUser, truncateAllTables } from './setup';

jest.setTimeout(20000);

describe('user router', () => {
  const publicCaller = createPublicCaller();

  beforeEach(async () => {
    await truncateAllTables();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const result = await publicCaller.user.register({
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'Password123',
      });

      expect(result).toBeDefined();
      expect(result.email).toBe('new@example.com');
      expect(result.firstName).toBe('New');
      expect(result.lastName).toBe('User');
      expect(result).not.toHaveProperty('password');
    });

    it('should reject duplicate email', async () => {
      await seedUser({ email: 'dup@example.com' });

      await expect(
        publicCaller.user.register({
          email: 'dup@example.com',
          firstName: 'Dup',
          lastName: 'User',
          password: 'Password123',
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should reject invalid input (empty email)', async () => {
      await expect(
        publicCaller.user.register({
          email: '',
          firstName: 'Test',
          lastName: 'User',
          password: 'Password123',
        }),
      ).rejects.toThrow();
    });

    it('should reject weak password (no uppercase)', async () => {
      await expect(
        publicCaller.user.register({
          email: 'weak@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        }),
      ).rejects.toThrow();
    });

    it('should reject weak password (no number)', async () => {
      await expect(
        publicCaller.user.register({
          email: 'weak@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'Passwordabc',
        }),
      ).rejects.toThrow();
    });

    it('should reject weak password (too short)', async () => {
      await expect(
        publicCaller.user.register({
          email: 'weak@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'Pass1',
        }),
      ).rejects.toThrow();
    });
  });

  describe('me', () => {
    it('should return the current authenticated user', async () => {
      const user = await seedUser();
      const caller = createAuthenticatedCaller(user.id);

      const result = await caller.user.me();

      expect(result).toBeDefined();
      expect(result?.id).toBe(user.id);
      expect(result?.email).toBe('test@example.com');
      expect(result?.reportingCurrency).toBeNull();
      expect(result?.valuationFreshnessDays).toBe(3);
      expect(result).not.toHaveProperty('password');
    });

    it('should return UNAUTHORIZED without authentication', async () => {
      await expect(publicCaller.user.me()).rejects.toThrow(TRPCError);
    });
  });

  describe('updateProfile', () => {
    it('should update first and last name', async () => {
      const user = await seedUser();
      const caller = createAuthenticatedCaller(user.id);

      const result = await caller.user.updateProfile({
        firstName: 'Updated',
        lastName: 'Name',
      });

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
      expect(result).not.toHaveProperty('password');
    });

    it('should update email', async () => {
      const user = await seedUser();
      const caller = createAuthenticatedCaller(user.id);

      const result = await caller.user.updateProfile({
        email: 'newemail@example.com',
      });

      expect(result.email).toBe('newemail@example.com');
    });

    it('should reject duplicate email on update', async () => {
      await seedUser({ email: 'taken@example.com' });
      const user = await seedUser({ email: 'other@example.com' });
      const caller = createAuthenticatedCaller(user.id);

      await expect(caller.user.updateProfile({ email: 'taken@example.com' })).rejects.toThrow(TRPCError);
    });

    it('should reject without authentication', async () => {
      await expect(publicCaller.user.updateProfile({ firstName: 'X' })).rejects.toThrow(TRPCError);
    });
  });

  describe('valuation preferences', () => {
    it('returns the current saved valuation preferences', async () => {
      const user = await seedUser({ reportingCurrency: CurrencyEnum.EUR, valuationFreshnessDays: 5 });
      const caller = createAuthenticatedCaller(user.id);

      await expect(caller.user.getValuationPreferences()).resolves.toEqual({
        reportingCurrency: CurrencyEnum.EUR,
        valuationFreshnessDays: 5,
      });
    });

    it('persists reporting currency and freshness updates', async () => {
      const user = await seedUser();
      const caller = createAuthenticatedCaller(user.id);

      await expect(
        caller.user.updateValuationPreferences({
          reportingCurrency: CurrencyEnum.USD,
          valuationFreshnessDays: 7,
        }),
      ).resolves.toEqual({
        reportingCurrency: CurrencyEnum.USD,
        valuationFreshnessDays: 7,
      });

      await expect(caller.user.me()).resolves.toMatchObject({
        reportingCurrency: CurrencyEnum.USD,
        valuationFreshnessDays: 7,
      });
    });
  });

  describe('manual fx rates', () => {
    it('creates, lists, updates, and deletes manual fx rates', async () => {
      const user = await seedUser();
      const caller = createAuthenticatedCaller(user.id);

      const created = await caller.user.createFxRate({
        baseCurrency: CurrencyEnum.EUR,
        quoteCurrency: CurrencyEnum.USD,
        rate: 1.08,
        effectiveDate: '2026-04-18',
        sourceLabel: 'Manual close',
      });

      expect(created).toMatchObject({
        userId: user.id,
        baseCurrency: CurrencyEnum.EUR,
        quoteCurrency: CurrencyEnum.USD,
        rate: 1.08,
        effectiveDate: '2026-04-18',
        sourceLabel: 'Manual close',
      });

      await expect(caller.user.listFxRates()).resolves.toEqual([
        expect.objectContaining({
          id: created.id,
          baseCurrency: CurrencyEnum.EUR,
          quoteCurrency: CurrencyEnum.USD,
        }),
      ]);

      await expect(
        caller.user.updateFxRate({
          id: created.id,
          rate: 1.11,
          effectiveDate: '2026-04-19',
          sourceLabel: 'Updated manual close',
        }),
      ).resolves.toMatchObject({
        id: created.id,
        rate: 1.11,
        effectiveDate: '2026-04-19',
        sourceLabel: 'Updated manual close',
      });

      await expect(caller.user.deleteFxRate({ id: created.id })).resolves.toEqual({ id: created.id });
      await expect(caller.user.listFxRates()).resolves.toEqual([]);
    });
  });

  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      const user = await seedUser();
      const caller = createAuthenticatedCaller(user.id);

      const result = await caller.user.changePassword({
        currentPassword: 'password123',
        newPassword: 'NewPassword456',
      });

      expect(result).toEqual({ success: true });
    });

    it('should reject with wrong current password', async () => {
      const user = await seedUser();
      const caller = createAuthenticatedCaller(user.id);

      await expect(
        caller.user.changePassword({
          currentPassword: 'wrong-password',
          newPassword: 'NewPassword456',
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should reject weak new password', async () => {
      const user = await seedUser();
      const caller = createAuthenticatedCaller(user.id);

      await expect(
        caller.user.changePassword({
          currentPassword: 'password123',
          newPassword: 'weak',
        }),
      ).rejects.toThrow();
    });

    it('should reject without authentication', async () => {
      await expect(
        publicCaller.user.changePassword({
          currentPassword: 'password123',
          newPassword: 'NewPassword456',
        }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
