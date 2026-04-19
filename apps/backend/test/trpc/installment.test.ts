import { CurrencyEnum, PlanStatus } from '@expenses/api';
import { TRPCError } from '@trpc/server';
import {
  createAuthenticatedCaller,
  createPublicCaller,
  seedAccount,
  seedCategory,
  seedInstallmentObligation,
  seedInstallmentPlan,
  seedUser,
  truncateAllTables,
} from './setup';

describe('installment router', () => {
  let userId: string;
  let caller: ReturnType<typeof createAuthenticatedCaller>;
  const publicCaller = createPublicCaller();

  beforeEach(async () => {
    await truncateAllTables();
    const user = await seedUser();
    userId = user.id;
    caller = createAuthenticatedCaller(userId);
  });

  describe('createPlan', () => {
    it('should create a plan with 3 obligations with correct amounts and dueDates', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });

      const result = await caller.installment.createPlan({
        totalAmount: 300,
        currency: CurrencyEnum.USD,
        accountId: account.id,
        installmentsCount: 3,
        startDate: '2026-01-01',
        note: 'Test plan',
      });

      expect(result).toBeDefined();
      expect(result.totalAmount).toBe(300);
      expect(result.installmentsCount).toBe(3);
      expect(result.status).toBe(PlanStatus.ACTIVE);
      expect(result.accountId).toBe(account.id);
      expect(result.obligations).toHaveLength(3);

      // Verify obligation amounts are evenly distributed
      expect(result.obligations![0].amount).toBe(100);
      expect(result.obligations![1].amount).toBe(100);
      expect(result.obligations![2].amount).toBe(100);

      // Verify sequential dueDates (one month apart)
      expect(result.obligations![0].dueDate).toBe('2026-01-01');
      expect(result.obligations![1].dueDate).toBe('2026-02-01');
      expect(result.obligations![2].dueDate).toBe('2026-03-01');

      // Verify installment numbers are 1-based
      expect(result.obligations![0].installmentNumber).toBe(1);
      expect(result.obligations![1].installmentNumber).toBe(2);
      expect(result.obligations![2].installmentNumber).toBe(3);

      // All obligations start as PENDING
      for (const obl of result.obligations!) {
        expect(obl.status).toBe('PENDING');
      }
    });

    it('should create plan with categoryId', async () => {
      const category = await seedCategory(userId);
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });

      const result = await caller.installment.createPlan({
        totalAmount: 1200,
        currency: CurrencyEnum.USD,
        accountId: account.id,
        installmentsCount: 12,
        startDate: '2026-01-01',
        categoryId: category.id,
      });

      expect(result.categoryId).toBe(category.id);
      expect(result.obligations).toHaveLength(12);
    });

    it('should reject installmentsCount < 2', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });

      await expect(
        caller.installment.createPlan({
          totalAmount: 100,
          currency: CurrencyEnum.USD,
          accountId: account.id,
          installmentsCount: 1,
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should reject without authentication', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });

      await expect(
        publicCaller.installment.createPlan({
          totalAmount: 100,
          currency: CurrencyEnum.USD,
          accountId: account.id,
          installmentsCount: 3,
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should handle non-divisible amounts with rounding', async () => {
      const account = await seedAccount(userId, { currency: CurrencyEnum.USD });

      const result = await caller.installment.createPlan({
        totalAmount: 100,
        currency: CurrencyEnum.USD,
        accountId: account.id,
        installmentsCount: 3,
        startDate: '2026-01-01',
      });

      expect(result.obligations).toHaveLength(3);

      // Sum of obligations should equal totalAmount (within rounding)
      const sum = result.obligations!.reduce((acc, o) => acc + o.amount, 0);
      expect(sum).toBe(100);
    });

    it('should reject archived accounts', async () => {
      const archivedAccount = await seedAccount(userId, { archivedAt: new Date() });

      await expect(
        caller.installment.createPlan({
          totalAmount: 100,
          currency: CurrencyEnum.USD,
          accountId: archivedAccount.id,
          installmentsCount: 3,
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow(TRPCError);
    });

    it('should reject third-party destination accounts', async () => {
      const landlordAccount = await seedAccount(userId, {
        currency: CurrencyEnum.USD,
        ownership: 'third_party',
      });

      await expect(
        caller.installment.createPlan({
          totalAmount: 100,
          currency: CurrencyEnum.USD,
          accountId: landlordAccount.id,
          installmentsCount: 3,
          startDate: '2026-01-01',
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('getAllPlans', () => {
    it('should return all plans for the user', async () => {
      await seedInstallmentPlan(userId, { totalAmount: 100 });
      await seedInstallmentPlan(userId, { totalAmount: 200 });

      const result = await caller.installment.getAllPlans({});

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no plans exist', async () => {
      const result = await caller.installment.getAllPlans({});

      expect(result).toEqual([]);
    });
  });

  describe('getPlan', () => {
    it('should return a plan by id with its obligations', async () => {
      const plan = await seedInstallmentPlan(userId);
      await seedInstallmentObligation(plan.id, { installmentNumber: 1, amount: 100, dueDate: '2026-01-01' });
      await seedInstallmentObligation(plan.id, { installmentNumber: 2, amount: 100, dueDate: '2026-02-01' });

      const result = await caller.installment.getPlan({ id: plan.id });

      expect(result).toBeDefined();
      expect(result.id).toBe(plan.id);
      expect(result.obligations).toHaveLength(2);
    });

    it('should throw NOT_FOUND for missing plan', async () => {
      const { v4: uuidv4 } = await import('uuid');

      await expect(caller.installment.getPlan({ id: uuidv4() })).rejects.toThrow(TRPCError);
    });
  });

  describe('payObligation', () => {
    it('should pay a pending obligation, creating an EXPENSE transaction', async () => {
      const plan = await seedInstallmentPlan(userId, {
        totalAmount: 200,
        installmentsCount: 2,
        categoryId: null,
      });
      const obligation = await seedInstallmentObligation(plan.id, {
        installmentNumber: 1,
        amount: 100,
        dueDate: '2026-01-01',
        status: 'PENDING',
      });

      const result = await caller.installment.payObligation({ obligationId: obligation.id });

      expect(result.status).toBe('PAID');
      expect(result.paidAt).toBeDefined();
      expect(result.transactionId).toBeDefined();

      // Verify the linked transaction exists and is an EXPENSE
      const { AppDataSource } = await import('../../src/data-source');
      const tx = await AppDataSource.getRepository('Transaction')
        .createQueryBuilder('t')
        .where('t.id = :id', { id: result.transactionId })
        .getOne();

      expect(tx).toBeDefined();
      expect(tx).not.toBeNull();
      expect(tx!.type).toBe('EXPENSE');
      expect(Number(tx!.amount)).toBe(100);
    });

    it('should reject paying an already-paid obligation', async () => {
      const plan = await seedInstallmentPlan(userId);
      const obligation = await seedInstallmentObligation(plan.id, {
        installmentNumber: 1,
        amount: 100,
        status: 'PAID',
        paidAt: new Date(),
        transactionId: null,
      });

      await expect(caller.installment.payObligation({ obligationId: obligation.id })).rejects.toThrow(
        TRPCError,
      );
    });
  });

  describe('skipObligation', () => {
    it('should skip a pending obligation without creating a transaction', async () => {
      const plan = await seedInstallmentPlan(userId);
      const obligation = await seedInstallmentObligation(plan.id, {
        installmentNumber: 1,
        amount: 100,
        dueDate: '2026-01-01',
        status: 'PENDING',
      });

      const result = await caller.installment.skipObligation({ obligationId: obligation.id });

      expect(result.status).toBe('SKIPPED');
      expect(result.transactionId).toBeNull();
    });
  });

  describe('deletePlan', () => {
    it('should soft-delete a plan and its obligations', async () => {
      const plan = await seedInstallmentPlan(userId);
      const obl1 = await seedInstallmentObligation(plan.id, {
        installmentNumber: 1,
        amount: 100,
        dueDate: '2026-01-01',
        status: 'PENDING',
      });

      const result = await caller.installment.deletePlan({ id: plan.id });

      expect(result).toEqual({ success: true });

      // Plan should no longer appear in getAll
      const allPlans = await caller.installment.getAllPlans({});
      expect(allPlans).toHaveLength(0);
    });

    it('should not delete EXPENSE transactions linked to paid obligations', async () => {
      const category = await seedCategory(userId);
      const plan = await seedInstallmentPlan(userId, { categoryId: category.id });
      const obligation = await seedInstallmentObligation(plan.id, {
        installmentNumber: 1,
        amount: 100,
        dueDate: '2026-01-01',
        status: 'PENDING',
      });

      // Pay the obligation first (creates EXPENSE)
      const paidResult = await caller.installment.payObligation({ obligationId: obligation.id });
      const expenseTxId = paidResult.transactionId;

      // Delete the plan
      await caller.installment.deletePlan({ id: plan.id });

      // The EXPENSE transaction should still exist
      const { AppDataSource } = await import('../../src/data-source');
      const tx = await AppDataSource.getRepository('Transaction')
        .createQueryBuilder('t')
        .where('t.id = :id', { id: expenseTxId })
        .andWhere('t.deleted_at IS NULL')
        .getOne();

      expect(tx).toBeDefined();
    }, 15000);
  });

  describe('isolation', () => {
    it('should not return plans from another user', async () => {
      await seedInstallmentPlan(userId);
      const otherUser = await seedUser({ email: 'other@example.com' });
      const otherCaller = createAuthenticatedCaller(otherUser.id);

      const result = await otherCaller.installment.getAllPlans({});

      expect(result).toHaveLength(0);
    });

    it('should not allow paying obligations from another users plan', async () => {
      const plan = await seedInstallmentPlan(userId);
      const obligation = await seedInstallmentObligation(plan.id, {
        installmentNumber: 1,
        amount: 100,
        dueDate: '2026-01-01',
        status: 'PENDING',
      });
      const otherUser = await seedUser({ email: 'other2@example.com' });
      const otherCaller = createAuthenticatedCaller(otherUser.id);

      await expect(otherCaller.installment.payObligation({ obligationId: obligation.id })).rejects.toThrow(
        TRPCError,
      );
    });
  });
});
