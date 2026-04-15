import { CurrencyEnum, FinancialGoalsType } from '@expenses/api';
import { TRPCError } from '@trpc/server';
import {
  createAuthenticatedCaller,
  createPublicCaller,
  seedFinancialGoal,
  seedUser,
  truncateAllTables,
} from './setup';

describe('financialGoal router', () => {
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
    it('should create a financial goal', async () => {
      const result = await caller.financialGoal.create({
        type: FinancialGoalsType.SPEND_LESS,
        targetAmount: 1000,
        currency: CurrencyEnum.USD,
        name: 'Save on food',
        targetDate: '2026-01-01',
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Save on food');
      expect(result?.type).toBe(FinancialGoalsType.SPEND_LESS);
      expect(result?.targetAmount).toBe(1000);
      expect(result?.currency).toBe(CurrencyEnum.USD);
    });

    it('should reject invalid input (negative targetAmount)', async () => {
      await expect(
        caller.financialGoal.create({
          type: FinancialGoalsType.SPEND_LESS,
          targetAmount: -1,
          currency: CurrencyEnum.USD,
          name: 'Invalid',
          targetDate: '2026-01-01',
        }),
      ).rejects.toThrow();
    });

    it('should reject without authentication', async () => {
      await expect(
        publicCaller.financialGoal.create({
          type: FinancialGoalsType.SPEND_LESS,
          targetAmount: 1000,
          currency: CurrencyEnum.USD,
          name: 'Save on food',
          targetDate: '2026-01-01',
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getAll', () => {
    it('should return all financial goals for the user', async () => {
      await seedFinancialGoal(userId, { name: 'Goal 1' });
      await seedFinancialGoal(userId, { name: 'Goal 2' });

      const result = await caller.financialGoal.getAll();

      expect(result).toHaveLength(2);
      expect(result.map((g: { name: string }) => g.name)).toEqual(
        expect.arrayContaining(['Goal 1', 'Goal 2']),
      );
    });

    it('should return empty array when no goals exist', async () => {
      const result = await caller.financialGoal.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return a financial goal by id', async () => {
      const goal = await seedFinancialGoal(userId, { name: 'My Goal' });

      const result = await caller.financialGoal.getById({
        id: goal.id,
      });

      expect(result).toBeDefined();
      expect(result?.name).toBe('My Goal');
    });

    it('should throw for missing goal', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(
        caller.financialGoal.getById({
          id: uuidv4(),
        }),
      ).rejects.toThrow();
    });
  });
});
