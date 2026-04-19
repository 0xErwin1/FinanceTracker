import { CurrencyEnum, TransactionType } from '@expenses/api';
import { TRPCError } from '@trpc/server';
import { AppDataSource } from '../../src/data-source';
import { FxRate } from '../../src/entities';
import {
  createAuthenticatedCaller,
  createPublicCaller,
  seedAccount,
  seedBudget,
  seedCategory,
  seedTransaction,
  seedUser,
  truncateAllTables,
} from './setup';

describe('budget router', () => {
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
    it('should create a budget', async () => {
      const category = await seedCategory(userId);

      const result = await caller.budget.create({
        categoryId: category.id,
        month: '2025-01-01',
        amount: 500,
        alertThreshold: 80,
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(500);
      expect(result.month).toBe('2025-01-01');
      expect(result.categoryId).toBe(category.id);
    });

    it('should create a budget without alertThreshold', async () => {
      const category = await seedCategory(userId);

      const result = await caller.budget.create({
        categoryId: category.id,
        month: '2025-02-01',
        amount: 300,
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(300);
    });

    it('should reject duplicate category+month budget', async () => {
      const category = await seedCategory(userId);

      await caller.budget.create({
        categoryId: category.id,
        month: '2025-01-01',
        amount: 500,
      });

      await expect(
        caller.budget.create({
          categoryId: category.id,
          month: '2025-01-01',
          amount: 600,
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should reject without authentication', async () => {
      const category = await seedCategory(userId);

      await expect(
        publicCaller.budget.create({
          categoryId: category.id,
          month: '2025-01-01',
          amount: 500,
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getAll', () => {
    it('should return all budgets for the user', async () => {
      await seedBudget(userId);
      await seedBudget(userId, { month: '2025-02-01', amount: 300 });

      const result = await caller.budget.getAll({});

      expect(result).toHaveLength(2);
    });

    it('should filter budgets by month', async () => {
      await seedBudget(userId, { month: '2025-01-01' });
      await seedBudget(userId, { month: '2025-02-01' });

      const result = await caller.budget.getAll({ month: '2025-01-01' });

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no budgets exist', async () => {
      const result = await caller.budget.getAll({});

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return a budget by id', async () => {
      const budget = await seedBudget(userId);

      const result = await caller.budget.getById({ id: budget.id });

      expect(result).toBeDefined();
      expect(result?.id).toBe(budget.id);
      expect(result?.amount).toBe(500);
    });

    it('should throw NOT_FOUND for missing budget', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(caller.budget.getById({ id: uuidv4() })).rejects.toThrow(TRPCError);
    });
  });

  describe('update', () => {
    it('should update a budget', async () => {
      const budget = await seedBudget(userId);

      const result = await caller.budget.update({
        id: budget.id,
        amount: 600,
      });

      expect(result).toBeDefined();
      expect(result.amount).toBe(600);
    });

    it('should update alertThreshold', async () => {
      const budget = await seedBudget(userId);

      const result = await caller.budget.update({
        id: budget.id,
        alertThreshold: 90,
      });

      expect(result).toBeDefined();
      expect(result.alertThreshold).toBe(90);
    });

    it('should throw NOT_FOUND for missing budget', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(caller.budget.update({ id: uuidv4(), amount: 100 })).rejects.toThrow(TRPCError);
    });
  });

  describe('delete', () => {
    it('should delete a budget', async () => {
      const budget = await seedBudget(userId);

      const result = await caller.budget.delete({ id: budget.id });

      expect(result).toEqual({ success: true });
    });

    it('should throw NOT_FOUND for missing budget', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(caller.budget.delete({ id: uuidv4() })).rejects.toThrow(TRPCError);
    });
  });

  describe('getAlerts', () => {
    it('should return alerts when spending exceeds threshold', async () => {
      const category = await seedCategory(userId);

      await caller.budget.create({
        categoryId: category.id,
        month: '2025-01-01',
        amount: 500,
        alertThreshold: 80,
      });

      await seedTransaction(userId, {
        categoryId: category.id,
        type: TransactionType.EXPENSE,
        amount: 420,
        date: '2025-01-15',
      });

      const result = await caller.budget.getAlerts({ month: '2025-01-01' });

      expect(result).toHaveLength(1);
      expect(result[0].spent).toBe(420);
      expect(result[0].isNearLimit).toBe(true);
      expect(result[0].isOverBudget).toBe(false);
    });

    it('should return empty when no budgets exist for month', async () => {
      const result = await caller.budget.getAlerts({ month: '2025-06-01' });

      expect(result).toEqual([]);
    });

    it('should detect over-budget', async () => {
      const category = await seedCategory(userId);

      await caller.budget.create({
        categoryId: category.id,
        month: '2025-03-01',
        amount: 100,
        alertThreshold: 80,
      });

      await seedTransaction(userId, {
        categoryId: category.id,
        type: TransactionType.EXPENSE,
        amount: 150,
        date: '2025-03-10',
      });

      const result = await caller.budget.getAlerts({ month: '2025-03-01' });

      expect(result).toHaveLength(1);
      expect(result[0].isOverBudget).toBe(true);
      expect(result[0].spent).toBe(150);
    });

    it('ignores transfer rows when calculating spent totals', async () => {
      const category = await seedCategory(userId);

      await caller.budget.create({
        categoryId: category.id,
        month: '2025-04-01',
        amount: 300,
        alertThreshold: 80,
      });

      await seedTransaction(userId, {
        categoryId: category.id,
        type: TransactionType.EXPENSE,
        amount: 120,
        date: '2025-04-05',
      });

      await seedTransaction(userId, {
        categoryId: category.id,
        type: TransactionType.EXPENSE,
        amount: 400,
        date: '2025-04-06',
        transferGroupId: '11111111-1111-1111-1111-111111111111',
      });

      const result = await caller.budget.getAlerts({ month: '2025-04-01' });

      expect(result).toHaveLength(1);
      expect(result[0].spent).toBe(120);
      expect(result[0].isOverBudget).toBe(false);
    });

    it('attaches native spent subtotals and partial valuation coverage for mixed-currency spending', async () => {
      const user = await seedUser({
        email: 'budget-valuation@example.com',
        reportingCurrency: CurrencyEnum.USD,
        valuationFreshnessDays: 3,
      });
      const valuationCaller = createAuthenticatedCaller(user.id);
      const category = await seedCategory(user.id);
      const eurAccount = await seedAccount(user.id, { currency: CurrencyEnum.EUR });

      await valuationCaller.budget.create({
        categoryId: category.id,
        month: '2025-05-01',
        amount: 500,
        alertThreshold: 80,
      });

      await seedTransaction(user.id, {
        categoryId: category.id,
        type: TransactionType.EXPENSE,
        amount: 120,
        currency: CurrencyEnum.USD,
        date: '2025-05-05',
      });

      await seedTransaction(user.id, {
        categoryId: category.id,
        accountId: eurAccount.id,
        type: TransactionType.EXPENSE,
        amount: 40,
        currency: CurrencyEnum.EUR,
        date: '2025-05-06',
      });

      await AppDataSource.getRepository(FxRate).save(
        AppDataSource.getRepository(FxRate).create({
          userId: user.id,
          baseCurrency: CurrencyEnum.EUR,
          quoteCurrency: CurrencyEnum.USD,
          rate: 1.2,
          effectiveDate: '2025-05-04',
          sourceLabel: 'Manual close',
        }),
      );

      const result = await valuationCaller.budget.getAlerts({ month: '2025-05-01' });

      expect(result[0]).toMatchObject({
        nativeSpentByCurrency: {
          EUR: 40,
          USD: 120,
        },
        valuationSnapshot: {
          reportingCurrency: CurrencyEnum.USD,
          valuationDate: '2025-05-31',
          coverage: 'stale',
          estimatedTotal: 168,
          nativeTotals: {
            EUR: 40,
            USD: 120,
          },
          coveredCurrencies: [CurrencyEnum.EUR, CurrencyEnum.USD],
          missingCurrencies: [],
          staleCurrencies: [CurrencyEnum.EUR],
          sourceLabels: ['Manual close'],
          effectiveDates: ['2025-05-04'],
        },
      });
    }, 15000);
  });
});
