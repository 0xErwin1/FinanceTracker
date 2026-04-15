import { TRPCError } from '@trpc/server';
import { createPublicCaller, seedUser, truncateAllTables } from './setup';

describe('auth router', () => {
  const caller = createPublicCaller();

  beforeEach(async () => {
    await truncateAllTables();
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const user = await seedUser();

      const result = await caller.auth.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.id).toBe(user.id);
    });

    it('should fail with non-existent email', async () => {
      await expect(
        caller.auth.login({
          email: 'nobody@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should fail with wrong password', async () => {
      await seedUser();

      await expect(
        caller.auth.login({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should reject invalid input (empty email)', async () => {
      await expect(
        caller.auth.login({
          email: '',
          password: 'password123',
        }),
      ).rejects.toThrow();
    });

    it('should reject invalid input (missing password)', async () => {
      await expect(
        caller.auth.login({
          email: 'test@example.com',
          password: '',
        }),
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const result = await caller.auth.logout();

      expect(result).toEqual({ success: true });
    });
  });
});
