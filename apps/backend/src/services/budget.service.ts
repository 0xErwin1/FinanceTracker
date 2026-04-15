import { Between } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Budget, Category, Transaction } from '../entities';
import { ApiError, TransactionType } from '../enums';
import { CustomError } from '../lib';
import type { BudgetAlert, BudgetDTO } from '../types/DTOs';

const repo = () => AppDataSource.getRepository(Budget);

interface CreateBudgetInput {
  userId: string;
  categoryId: string;
  month: string;
  amount: number;
  alertThreshold?: number;
}

interface UpdateBudgetInput {
  amount?: number;
  alertThreshold?: number | null;
}

async function createBudget(input: CreateBudgetInput): Promise<BudgetDTO> {
  const category = await AppDataSource.getRepository(Category).findOne({
    where: { id: input.categoryId, userId: input.userId },
  });

  if (!category) {
    throw new CustomError(ApiError.Budget.CATEGORY_NOT_FOUND);
  }

  const existing = await repo().findOne({
    where: {
      userId: input.userId,
      categoryId: input.categoryId,
      month: input.month,
    },
  });

  if (existing) {
    throw new CustomError(ApiError.Budget.BUDGET_ALREADY_EXISTS);
  }

  const budget = repo().create(input);
  await repo().save(budget);

  return budget;
}

async function updateBudget(id: string, userId: string, data: UpdateBudgetInput): Promise<BudgetDTO> {
  const budget = await repo().findOne({ where: { id, userId } });

  if (!budget) {
    throw new CustomError(ApiError.Budget.BUDGET_NOT_EXIST);
  }

  Object.assign(budget, data);
  await repo().save(budget);

  return budget;
}

async function deleteBudget(id: string, userId: string): Promise<void> {
  const budget = await repo().findOne({ where: { id, userId } });

  if (!budget) {
    throw new CustomError(ApiError.Budget.BUDGET_NOT_EXIST);
  }

  await repo().delete(id);
}

async function getBudget(id: string, userId: string): Promise<BudgetDTO | null> {
  return repo().findOne({
    where: { id, userId },
    relations: ['category'],
  });
}

async function getAllBudgets(userId: string, month?: string): Promise<BudgetDTO[]> {
  const where: any = { userId };
  if (month) {
    where.month = month;
  }

  return repo().find({
    where,
    relations: ['category'],
    order: { month: 'DESC' },
  });
}

async function getBudgetAlerts(userId: string, month: string): Promise<BudgetAlert[]> {
  const budgets = await repo().find({
    where: { userId, month },
    relations: ['category'],
  });

  const [year, monthNum] = month.split('-').map(Number);
  const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const alerts: BudgetAlert[] = [];

  for (const budget of budgets) {
    const transactions = await AppDataSource.getRepository(Transaction).find({
      where: {
        userId,
        categoryId: budget.categoryId,
        type: TransactionType.EXPENSE as any,
        date: Between(startDate, endDate),
      },
    });

    const installments = await AppDataSource.getRepository(Transaction).find({
      where: {
        userId,
        categoryId: budget.categoryId,
        type: TransactionType.INSTALLMENTS as any,
        date: Between(startDate, endDate),
      },
    });

    const allSpending = [...transactions, ...installments];
    const spent = allSpending.reduce((sum, t) => sum + Number.parseFloat(String(t.amount)), 0);
    const budgetAmount = Number.parseFloat(String(budget.amount));
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

    alerts.push({
      budget,
      spent,
      percentage: +percentage.toFixed(2),
      isOverBudget: spent >= budgetAmount,
      isNearLimit:
        budget.alertThreshold !== null && percentage >= Number.parseFloat(String(budget.alertThreshold)),
    });
  }

  return alerts;
}

export const budgetService = {
  createBudget,
  updateBudget,
  deleteBudget,
  getBudget,
  getAllBudgets,
  getBudgetAlerts,
};
