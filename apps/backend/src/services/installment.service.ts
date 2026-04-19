import { type EntityManager } from 'typeorm';
import { accountService, categoryService } from '.';
import { AppDataSource } from '../data-source';
import { InstallmentObligation, InstallmentPlan } from '../entities';
import { ApiError, CurrencyEnum, ObligationStatus, PlanStatus } from '../enums';
import { CustomError, cacheInvalidateUser } from '../lib';

const planRepo = () => AppDataSource.getRepository(InstallmentPlan);
const obligationRepo = () => AppDataSource.getRepository(InstallmentObligation);

interface CreatePlanInput {
  userId: string;
  totalAmount: number;
  currency: CurrencyEnum;
  installmentsCount: number;
  categoryId?: string;
  note?: string;
  startDate: string;
  accountId?: string;
}

async function createPlan(input: CreatePlanInput): Promise<InstallmentPlan> {
  if (input.installmentsCount < 2) {
    throw new CustomError(ApiError.Installment.INVALID_INSTALLMENTS_COUNT);
  }

  if (input.categoryId) {
    const category = await categoryService.getCategory({
      id: input.categoryId,
      userId: input.userId,
    });

    if (!category) {
      throw new CustomError(ApiError.Category.CATEGORY_NOT_EXIST);
    }
  }

  if (!input.accountId) {
    throw new CustomError(ApiError.Transaction.ACCOUNT_REQUIRED);
  }

  await accountService.getPostingAccount(input.accountId, input.userId, input.currency);

  return AppDataSource.transaction(async (em) => {
    const installmentAmount = Math.round((input.totalAmount / input.installmentsCount) * 100) / 100;
    const startDate = new Date(input.startDate);

    const plan = em.create(InstallmentPlan, {
      userId: input.userId,
      totalAmount: input.totalAmount,
      currency: input.currency,
      installmentsCount: input.installmentsCount,
      categoryId: input.categoryId ?? null,
      note: input.note ?? null,
      status: PlanStatus.ACTIVE,
      accountId: input.accountId,
    });

    await em.save(plan);

    const obligations: InstallmentObligation[] = [];

    for (let i = 1; i <= input.installmentsCount; i++) {
      const dueDate = new Date(startDate);
      dueDate.setUTCMonth(dueDate.getUTCMonth() + (i - 1));

      let amount = installmentAmount;

      // Last obligation gets the remainder to avoid rounding drift
      if (i === input.installmentsCount) {
        const allocated = installmentAmount * (input.installmentsCount - 1);
        amount = Math.round((input.totalAmount - allocated) * 100) / 100;
      }

      const obligation = em.create(InstallmentObligation, {
        planId: plan.id,
        installmentNumber: i,
        amount,
        dueDate: dueDate.toISOString().split('T')[0],
        status: ObligationStatus.PENDING,
        transactionId: null,
        paidAt: null,
      });

      obligations.push(obligation);
    }

    await em.save(obligations);

    plan.obligations = obligations;

    await cacheInvalidateUser(input.userId);

    return plan;
  });
}

async function getPlan(id: string, userId: string): Promise<InstallmentPlan | null> {
  const plan = await planRepo().findOne({
    where: { id, userId },
    relations: ['obligations'],
  });

  return plan;
}

async function getAllPlans(userId: string): Promise<InstallmentPlan[]> {
  return planRepo().find({
    where: { userId },
    relations: ['obligations'],
    order: { createdAt: 'DESC' },
  });
}

async function payObligation(
  obligationId: string,
  userId: string,
  transactionService: { createTransactionWithManager: (em: EntityManager, input: any) => Promise<any> },
): Promise<InstallmentObligation> {
  return AppDataSource.transaction(async (em) => {
    const obligation = await em.findOne(InstallmentObligation, {
      where: { id: obligationId },
      relations: ['plan'],
    });

    if (!obligation) {
      throw new CustomError(ApiError.Installment.OBLIGATION_NOT_FOUND);
    }

    if (obligation.plan.userId !== userId) {
      throw new CustomError(ApiError.Installment.OBLIGATION_NOT_FOUND);
    }

    if (obligation.status !== ObligationStatus.PENDING) {
      throw new CustomError(ApiError.Installment.OBLIGATION_ALREADY_PAID);
    }

    if (!obligation.plan.accountId) {
      throw new CustomError(ApiError.Transaction.ACCOUNT_REQUIRED);
    }

    await accountService.getPostingAccount(obligation.plan.accountId, userId, obligation.plan.currency);

    const transaction = await transactionService.createTransactionWithManager(em, {
      type: 'EXPENSE',
      amount: obligation.amount,
      currency: obligation.plan.currency,
      date: new Date().toISOString().split('T')[0],
      userId,
      categoryId: obligation.plan.categoryId ?? undefined,
      accountId: obligation.plan.accountId,
      note: obligation.plan.note ?? undefined,
      obligationId: obligation.id,
    });

    obligation.status = ObligationStatus.PAID;
    obligation.paidAt = new Date();
    obligation.transactionId = transaction.id;

    await em.save(obligation);

    // Check if all obligations are PAID → mark plan as COMPLETED
    const allObligations = await em.find(InstallmentObligation, {
      where: { planId: obligation.planId },
    });

    const allPaid = allObligations.every((o) => o.status === ObligationStatus.PAID);

    if (allPaid) {
      await em.update(InstallmentPlan, obligation.planId, {
        status: PlanStatus.COMPLETED,
      });
    }

    await cacheInvalidateUser(userId);

    return obligation;
  });
}

async function skipObligation(obligationId: string, userId: string): Promise<InstallmentObligation> {
  return AppDataSource.transaction(async (em) => {
    const obligation = await em.findOne(InstallmentObligation, {
      where: { id: obligationId },
      relations: ['plan'],
    });

    if (!obligation) {
      throw new CustomError(ApiError.Installment.OBLIGATION_NOT_FOUND);
    }

    if (obligation.plan.userId !== userId) {
      throw new CustomError(ApiError.Installment.OBLIGATION_NOT_FOUND);
    }

    if (obligation.status !== ObligationStatus.PENDING) {
      throw new CustomError(ApiError.Installment.OBLIGATION_NOT_PENDING);
    }

    obligation.status = ObligationStatus.SKIPPED;

    await em.save(obligation);
    await cacheInvalidateUser(userId);

    return obligation;
  });
}

async function deletePlan(id: string, userId: string): Promise<void> {
  const plan = await planRepo().findOne({ where: { id, userId } });

  if (!plan) {
    throw new CustomError(ApiError.Installment.NOT_EXIST);
  }

  // Soft-delete cascades to obligations via CASCADE constraint
  await planRepo().softDelete(id);

  await cacheInvalidateUser(userId);
}

async function getObligationsByPlan(planId: string, userId: string): Promise<InstallmentObligation[]> {
  const plan = await planRepo().findOne({ where: { id: planId, userId } });

  if (!plan) {
    throw new CustomError(ApiError.Installment.NOT_EXIST);
  }

  return obligationRepo().find({
    where: { planId },
    order: { installmentNumber: 'ASC' },
  });
}

export const installmentService = {
  createPlan,
  getPlan,
  getAllPlans,
  payObligation,
  skipObligation,
  deletePlan,
  getObligationsByPlan,
};
