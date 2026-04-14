import { TRPCError } from '@trpc/server';
import { createAuthenticatedCaller, createPublicCaller, seedUser, truncateAllTables } from './setup';

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
        password: 'password123',
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
          password: 'password123',
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should reject invalid input (empty email)', async () => {
      await expect(
        publicCaller.user.register({
          email: '',
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        }),
      ).rejects.toThrow();
    });
  });

  describe('me', () => {
    it('should return the current authenticated user', async () => {
      const user = await seedUser();
      const caller = createAuthenticatedCaller(user.userId);

      const result = await caller.user.me();

      expect(result).toBeDefined();
      expect(result.userId).toBe(user.userId);
      expect(result.email).toBe('test@example.com');
    });

    it('should return UNAUTHORIZED without authentication', async () => {
      await expect(publicCaller.user.me()).rejects.toThrow(TRPCError);
    });
  });
});
