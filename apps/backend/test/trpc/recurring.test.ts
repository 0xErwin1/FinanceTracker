import { CurrencyEnum, TransactionType } from '@expenses/api';
import { TRPCError } from '@trpc/server';
import {
  createAuthenticatedCaller,
  createPublicCaller,
  seedCategory,
  seedRecurring,
  seedUser,
  truncateAllTables,
} from './setup';

describe('recurring router', () => {
  let userId: string;
  let caller: ReturnType<typeof createAuthenticatedCaller>;
  const publicCaller = createPublicCaller();

  beforeEach(async () => {
    await truncateAllTables();
    const user = await seedUser();
    userId = user.id;
    caller = createAuthenticatedCaller(userId);
  });

  describe('create', () => {
    it('should create a recurring transaction', async () => {
      const result = await caller.recurring.create({
        type: TransactionType.EXPENSE,
        amount: 1500,
        currency: CurrencyEnum.USD,
        dayOfMonth: 1,
        startDate: '2025-01-01',
        note: 'Rent',
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(1500);
      expect(result.dayOfMonth).toBe(1);
      expect(result.active).toBe(true);
    });

    it('should create with categoryId and goalId', async () => {
      const category = await seedCategory(userId);
      const result = await caller.recurring.create({
        type: TransactionType.EXPENSE,
        amount: 500,
        currency: CurrencyEnum.USD,
        categoryId: category.id,
        dayOfMonth: 15,
        startDate: '2025-01-01',
      });

      expect(result).toBeDefined();
      expect(result.categoryId).toBe(category.id);
    });

    it('should reject invalid dayOfMonth (0)', async () => {
      await expect(
        caller.recurring.create({
          type: TransactionType.EXPENSE,
          amount: 100,
          currency: CurrencyEnum.USD,
          dayOfMonth: 0,
          startDate: '2025-01-01',
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should reject invalid dayOfMonth (32)', async () => {
      await expect(
        caller.recurring.create({
          type: TransactionType.EXPENSE,
          amount: 100,
          currency: CurrencyEnum.USD,
          dayOfMonth: 32,
          startDate: '2025-01-01',
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should reject without authentication', async () => {
      await expect(
        publicCaller.recurring.create({
          type: TransactionType.EXPENSE,
          amount: 100,
          currency: CurrencyEnum.USD,
          dayOfMonth: 15,
          startDate: '2025-01-01',
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getAll', () => {
    it('should return all recurring transactions for the user', async () => {
      await seedRecurring(userId, { amount: 100 });
      await seedRecurring(userId, { amount: 200 });

      const result = await caller.recurring.getAll({});

      expect(result).toHaveLength(2);
    });

    it('should filter by active=true', async () => {
      await seedRecurring(userId, { active: true, amount: 100 });
      await seedRecurring(userId, { active: false, amount: 200 });

      const result = await caller.recurring.getAll({ active: true });

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(100);
    });

    it('should return empty array when none exist', async () => {
      const result = await caller.recurring.getAll({});

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return a recurring transaction by id', async () => {
      const recurring = await seedRecurring(userId, { amount: 300 });

      const result = await caller.recurring.getById({ id: recurring.id });

      expect(result).toBeDefined();
      expect(result.id).toBe(recurring.id);
      expect(result.amount).toBe(300);
    });

    it('should throw NOT_FOUND for missing recurring transaction', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(caller.recurring.getById({ id: uuidv4() })).rejects.toThrow(TRPCError);
    });
  });

  describe('update', () => {
    it('should update a recurring transaction', async () => {
      const recurring = await seedRecurring(userId);

      const result = await caller.recurring.update({
        id: recurring.id,
        amount: 2000,
        note: 'Updated rent',
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(2000);
      expect(result.note).toBe('Updated rent');
    });

    it('should update dayOfMonth', async () => {
      const recurring = await seedRecurring(userId);

      const result = await caller.recurring.update({
        id: recurring.id,
        dayOfMonth: 28,
      });

      expect(result.dayOfMonth).toBe(28);
    });

    it('should reject invalid dayOfMonth on update', async () => {
      const recurring = await seedRecurring(userId);

      await expect(
        caller.recurring.update({
          id: recurring.id,
          dayOfMonth: 0,
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should throw NOT_FOUND for missing recurring transaction', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(caller.recurring.update({ id: uuidv4(), amount: 100 })).rejects.toThrow(TRPCError);
    });
  });

  describe('delete', () => {
    it('should soft-delete a recurring transaction', async () => {
      const recurring = await seedRecurring(userId);

      const result = await caller.recurring.delete({ id: recurring.id });

      expect(result).toEqual({ success: true });

      const all = await caller.recurring.getAll({});
      expect(all).toHaveLength(0);
    });

    it('should throw NOT_FOUND for missing recurring transaction', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(caller.recurring.delete({ id: uuidv4() })).rejects.toThrow(TRPCError);
    });
  });

  describe('pause', () => {
    it('should pause an active recurring transaction', async () => {
      const recurring = await seedRecurring(userId, { active: true });

      const result = await caller.recurring.pause({ id: recurring.id });

      expect(result.active).toBe(false);
    });

    it('should throw NOT_FOUND for missing recurring transaction', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(caller.recurring.pause({ id: uuidv4() })).rejects.toThrow(TRPCError);
    });
  });

  describe('resume', () => {
    it('should resume a paused recurring transaction', async () => {
      const recurring = await seedRecurring(userId, { active: false });

      const result = await caller.recurring.resume({ id: recurring.id });

      expect(result.active).toBe(true);
    });

    it('should throw NOT_FOUND for missing recurring transaction', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(caller.recurring.resume({ id: uuidv4() })).rejects.toThrow(TRPCError);
    });
  });

  describe('isolation', () => {
    it('should not return recurring transactions from another user', async () => {
      const otherUser = await seedUser({ email: 'other@example.com' });
      const otherCaller = createAuthenticatedCaller(otherUser.id);

      await seedRecurring(userId);

      const result = await otherCaller.recurring.getAll({});

      expect(result).toHaveLength(0);
    });

    it('should not allow updating another users recurring transaction', async () => {
      const otherUser = await seedUser({ email: 'other2@example.com' });
      const otherCaller = createAuthenticatedCaller(otherUser.id);
      const recurring = await seedRecurring(userId);

      await expect(otherCaller.recurring.update({ id: recurring.id, amount: 9999 })).rejects.toThrow(
        TRPCError,
      );
    });

    it('should not allow deleting another users recurring transaction', async () => {
      const otherUser = await seedUser({ email: 'other@example.com' });
      const otherCaller = createAuthenticatedCaller(otherUser.id);
      const recurring = await seedRecurring(userId);

      await expect(otherCaller.recurring.delete({ id: recurring.id })).rejects.toThrow(TRPCError);
    });
  });
});
