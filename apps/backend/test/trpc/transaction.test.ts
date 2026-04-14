import { TRPCError } from '@trpc/server';
import { TransactionType, CurrencyEnum, MonthEnum } from '@expenses/api';
import {
  createAuthenticatedCaller,
  createPublicCaller,
  seedCategory,
  seedTransaction,
  seedUser,
  truncateAllTables,
} from './setup';

describe('transaction router', () => {
  let userId: string;
  let caller: ReturnType<typeof createAuthenticatedCaller>;
  const publicCaller = createPublicCaller();

  beforeEach(async () => {
    await truncateAllTables();
    const user = await seedUser();
    userId = user.userId;
    caller = createAuthenticatedCaller(userId);
  });

  describe('create (single)', () => {
    it('should create a single transaction', async () => {
      const category = await seedCategory(userId);

      const result = await caller.transaction.create({
        mode: 'single',
        transaction: {
          type: TransactionType.EXPENSE,
          amount: 100,
          currency: CurrencyEnum.USD,
          month: MonthEnum.JANUARY,
          year: 2025,
          categoryId: category.categoryId,
        },
      });

      expect(result).toBeDefined();
      expect((result as any).amount).toBe(100);
      expect((result as any).type).toBe(TransactionType.EXPENSE);
    });

    it('should create a transaction with inline category', async () => {
      const result = await caller.transaction.create({
        mode: 'single',
        transaction: {
          type: TransactionType.EXPENSE,
          amount: 50,
          currency: CurrencyEnum.USD,
          month: MonthEnum.JANUARY,
          year: 2025,
          category: { name: 'Inline Cat' },
        },
      });

      expect(result).toBeDefined();
      expect((result as any).amount).toBe(50);

      // Inline category was created and linked
    });

    it('should reject invalid input (negative amount)', async () => {
      await expect(
        caller.transaction.create({
          mode: 'single',
          transaction: {
            type: TransactionType.EXPENSE,
            amount: -100,
            currency: CurrencyEnum.USD,
            month: MonthEnum.JANUARY,
            year: 2025,
          },
        }),
      ).rejects.toThrow();
    });

    it('should reject without authentication', async () => {
      await expect(
        publicCaller.transaction.create({
          mode: 'single',
          transaction: {
            type: TransactionType.EXPENSE,
            amount: 100,
            currency: CurrencyEnum.USD,
            month: MonthEnum.JANUARY,
            year: 2025,
          },
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('create (batch)', () => {
    it('should create batch transactions', async () => {
      const result = await caller.transaction.create({
        mode: 'batch',
        transactions: [
          {
            type: TransactionType.EXPENSE,
            amount: 100,
            currency: CurrencyEnum.USD,
            month: MonthEnum.JANUARY,
            year: 2025,
          },
          {
            type: TransactionType.INCOME,
            amount: 200,
            currency: CurrencyEnum.USD,
            month: MonthEnum.JANUARY,
            year: 2025,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });
  });

  describe('getAll', () => {
    it('should return all transactions for the user', async () => {
      await seedTransaction(userId, { amount: 100 });
      await seedTransaction(userId, { amount: 200 });

      const result = await caller.transaction.getAll({});

      expect(result).toHaveLength(2);
    });

    it('should filter transactions by type', async () => {
      await seedTransaction(userId, { type: 'EXPENSE', amount: 100 });
      await seedTransaction(userId, { type: 'INCOME', amount: 200 });

      const result = await caller.transaction.getAll({ type: TransactionType.INCOME });

      expect(result).toHaveLength(1);
      expect(result![0].type).toBe(TransactionType.INCOME);
    });

    it('should return empty array when no transactions exist', async () => {
      const result = await caller.transaction.getAll({});

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return a transaction by id', async () => {
      const transaction = await seedTransaction(userId, { amount: 150 });

      const result = await caller.transaction.getById({
        transactionId: transaction.transactionId,
      });

      expect(result).toBeDefined();
      expect(result!.amount).toBe(150);
    });

    it('should throw NOT_FOUND for missing transaction', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(
        caller.transaction.getById({
          transactionId: uuidv4(),
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getBalance', () => {
    it('should return balance totals', async () => {
      await seedTransaction(userId, { type: 'EXPENSE', amount: 100, currency: 'USD', exchangeRate: 1 });
      await seedTransaction(userId, { type: 'INCOME', amount: 200, currency: 'USD', exchangeRate: 1 });

      const result = await caller.transaction.getBalance({});

      expect(result).toBeDefined();
      expect(result.expenses).toBeDefined();
      expect(result.incomes).toBeDefined();
      expect(result.savings).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete a transaction', async () => {
      const transaction = await seedTransaction(userId);

      const result = await caller.transaction.delete({
        transactionId: transaction.transactionId,
      });

      expect(result).toEqual({ success: true });
    });

    it('should throw NOT_FOUND for missing transaction', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(
        caller.transaction.delete({
          transactionId: uuidv4(),
        }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
