import { Between, type EntityManager } from 'typeorm';
import { categoryService, financialGoalService } from '.';
import { AppDataSource } from '../data-source';
import { Category, FinancialGoal, Transaction } from '../entities';
import { ApiError, CurrencyEnum, FinancialGoalsType, TransactionType } from '../enums';
import { CustomError, cacheGet, cacheInvalidateUser, cacheSet, logger } from '../lib';
import type { CategoryDTO, TransactionDTO } from '../types/DTOs';
import type { Balances, TransactionBalances } from '../types/response/transactions';

interface TransactionInput {
  type: TransactionType;
  amount: number;
  currency: CurrencyEnum;
  note?: string;
  date: string;
  exchangeRate?: number;
  userId: string;
  categoryId?: string;
  category?: { type?: TransactionType; name?: string };
  goalId?: string;
  totalInstallments?: number;
  recurringTransactionId?: string;
}

const repo = () => AppDataSource.getRepository(Transaction);

async function deleteTransaction(transactionId: string, userId: string): Promise<void> {
  const transaction = await getTransaction({ id: transactionId, userId }, ['financialGoal']);

  if (!transaction) {
    throw new CustomError(ApiError.Transaction.TRANSACTION_NOT_EXIST);
  }

  if (transaction.goalId) {
    const currentAmount =
      Number.parseFloat(String(transaction.financialGoal?.currentAmount)) -
      Number.parseFloat(String(transaction.amount));

    await financialGoalService.updateFinancialGoal({ currentAmount }, { id: transaction.goalId });

    await repo().update(transactionId, { goalId: null });
  }

  await repo().softDelete(transactionId);

  await cacheInvalidateUser((transaction as any).userId);
}

async function createTransactionByArray(
  newTransactions: TransactionInput | TransactionInput[],
): Promise<TransactionDTO | TransactionDTO[]> {
  if (!Array.isArray(newTransactions)) {
    return createTransaction(newTransactions);
  }

  return AppDataSource.transaction(async (em) => {
    const results: TransactionDTO[] = [];

    for (const transactionData of newTransactions) {
      const result = await createTransactionWithManager(em, transactionData);
      if (Array.isArray(result)) {
        results.push(...result);
      } else {
        results.push(result);
      }
    }

    return results;
  });
}

async function createTransaction(input: TransactionInput): Promise<TransactionDTO | TransactionDTO[]> {
  return AppDataSource.transaction(async (em) => {
    return createTransactionWithManager(em, input);
  });
}

async function createInstallmentPlanWithManager(
  em: EntityManager,
  input: TransactionInput,
): Promise<TransactionDTO[]> {
  const { totalInstallments, amount, date, ...rest } = input;
  const installmentAmount = Math.round((amount / totalInstallments!) * 100) / 100;
  const startDate = new Date(date);

  const parent = em.create(Transaction, {
    ...rest,
    amount,
    date,
    type: TransactionType.INSTALLMENTS,
    totalInstallments,
    installmentNumber: null,
    installmentPlanId: null,
  });

  await em.save(parent);

  const children: Transaction[] = [];

  for (let i = 1; i <= totalInstallments!; i++) {
    const childDate = new Date(startDate);
    childDate.setMonth(childDate.getMonth() + (i - 1));

    const child = em.create(Transaction, {
      ...rest,
      amount: installmentAmount,
      date: childDate.toISOString().split('T')[0],
      type: TransactionType.INSTALLMENTS,
      totalInstallments: null,
      installmentNumber: i,
      installmentPlanId: parent.id,
    });

    children.push(child);
  }

  await em.save(children);

  await cacheInvalidateUser(input.userId);

  return [parent, ...children];
}

async function createTransactionWithManager(
  em: EntityManager,
  input: TransactionInput,
): Promise<TransactionDTO | TransactionDTO[]> {
  if (input.type === TransactionType.INSTALLMENTS && input.totalInstallments) {
    return createInstallmentPlanWithManager(em, input);
  }

  let category: CategoryDTO | null;

  if (input.categoryId) {
    category = await categoryService.getCategory({
      id: input.categoryId,
      type: input.type,
      userId: input.userId,
    });

    logger.debug({ category });

    if (!category) {
      throw new CustomError(ApiError.Category.CATEGORY_NOT_EXIST);
    }

    if (category.type !== input.type) {
      throw new CustomError(ApiError.Transaction.TRANSACTION_AND_CATEGORY_NOT_SAME_TYPE);
    }
  } else {
    if (input.category?.type && input.category.type !== input.type) {
      throw new CustomError(ApiError.Transaction.TRANSACTION_AND_CATEGORY_NOT_SAME_TYPE);
    }

    const type = input.category?.type ?? input.type;

    category = await categoryService.createCategory(
      {
        ...input.category,
        type,
        userId: input.userId,
        note: '',
        name: input.category?.name ?? '',
      },
      { entityManager: em },
    );
  }

  const transaction = em.create(Transaction, {
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    note: input.note ?? '',
    date: input.date,
    exchangeRate: input.exchangeRate ?? null,
    userId: input.userId,
    categoryId: category.id,
    goalId: input.goalId ?? null,
    recurringTransactionId: input.recurringTransactionId ?? null,
  });

  await em.save(transaction);

  await cacheInvalidateUser(input.userId);

  return transaction;
}

async function getBalance(userId: string, dateFrom?: string, dateTo?: string): Promise<TransactionBalances> {
  const cached = await cacheGet<TransactionBalances>(userId, 'balance', { dateFrom, dateTo });
  if (cached) return cached;

  const where: any = { userId };
  if (dateFrom || dateTo) {
    where.date = Between(dateFrom ?? '1970-01-01', dateTo ?? '2999-12-31');
  }

  const transactions = await getAllTransactions(where);
  const result = calculateBalances(transactions as TransactionDTO[]);

  await cacheSet(userId, 'balance', result, { dateFrom, dateTo });

  return result;
}

function calculateBalance(transaction: TransactionDTO, balances: Balances): void {
  const amount = Number.parseFloat(String(transaction.amount));
  const rawRate = Number.parseFloat(String(transaction.exchangeRate));
  const rate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : 1;

  switch (transaction.currency) {
    case CurrencyEnum.UYU:
      balances.uyu += amount;
      balances.total += amount;
      break;
    case CurrencyEnum.USD:
      balances.usd += amount;
      balances.total += amount * rate;
      break;
    case CurrencyEnum.EUR:
      balances.eur += amount;
      balances.total += amount * rate;
      break;
  }

  balances.total = +balances.total.toFixed(2);
  balances.eur = +balances.eur.toFixed(2);
  balances.usd = +balances.usd.toFixed(2);
  balances.uyu = +balances.uyu.toFixed(2);
}

function calculateBalances(transactions: TransactionDTO[]): TransactionBalances {
  const expenses: Balances = { total: 0, eur: 0, usd: 0, uyu: 0 };
  const incomes: Balances = { total: 0, eur: 0, usd: 0, uyu: 0 };
  const savings: Balances = { total: 0, eur: 0, usd: 0, uyu: 0 };

  for (const transaction of transactions) {
    switch (transaction.type) {
      case TransactionType.EXPENSE:
      case TransactionType.INSTALLMENTS:
        calculateBalance(transaction, expenses);
        break;
      case TransactionType.INCOME:
        calculateBalance(transaction, incomes);
        break;
      case TransactionType.SAVING:
        calculateBalance(transaction, savings);
        break;
    }
  }

  return { expenses, incomes, savings };
}

async function getAllTransactions(
  where: Record<string, any> = {},
  relations: string[] = ['category'],
): Promise<TransactionDTO[]> {
  const userId = where.userId as string | undefined;

  if (userId) {
    const cached = await cacheGet<TransactionDTO[]>(userId, 'all', where);
    if (cached) return cached;
  }

  const result = await repo().find({ where, relations, order: { date: 'DESC' } });

  if (userId) {
    await cacheSet(userId, 'all', result, where);
  }

  return result;
}

async function getTransaction(
  where: Partial<Pick<Transaction, 'id' | 'userId' | 'goalId'>>,
  relations: string[] = [],
): Promise<TransactionDTO | null> {
  let qb = repo().createQueryBuilder('transaction');

  if (where.id) qb = qb.andWhere('transaction.id = :id', { id: where.id });
  if (where.userId) qb = qb.andWhere('transaction.userId = :userId', { userId: where.userId });
  if (where.goalId !== undefined) {
    if (where.goalId === null) {
      qb = qb.andWhere('transaction.goalId IS NULL');
    } else {
      qb = qb.andWhere('transaction.goalId = :goalId', { goalId: where.goalId });
    }
  }

  for (const relation of relations) {
    qb = qb.leftJoinAndSelect(`transaction.${relation}`, relation);
  }

  return qb.getOne() ?? null;
}

type MonthByYear = Record<string, string[]>;

async function getMonthsAndYears(userId: string): Promise<MonthByYear> {
  const cached = await cacheGet<MonthByYear>(userId, 'months');
  if (cached) return cached;

  const transactions = await repo().find({
    where: { userId },
    select: ['date'],
  });

  const monthByYear: MonthByYear = {};
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  for (const t of transactions) {
    const d = new Date(t.date);
    const yearKey = String(d.getFullYear());
    const monthName = monthNames[d.getMonth()];

    if (!Object.prototype.hasOwnProperty.call(monthByYear, yearKey)) {
      monthByYear[yearKey] = [];
    }

    if (!monthByYear[yearKey].includes(monthName)) {
      monthByYear[yearKey].push(monthName);
    }

    monthByYear[yearKey].sort((a, b) => monthNames.indexOf(a) - monthNames.indexOf(b));
  }

  await cacheSet(userId, 'months', monthByYear);

  return monthByYear;
}

async function updateTransaction(
  data: Partial<Transaction>,
  where: Partial<Pick<Transaction, 'id' | 'userId'>>,
): Promise<TransactionDTO> {
  const transaction = await repo().findOne({ where: where as any });

  if (!transaction) {
    throw new CustomError(ApiError.Transaction.TRANSACTION_NOT_EXIST);
  }

  Object.assign(transaction, data);
  await repo().save(transaction);

  await cacheInvalidateUser(transaction.userId);

  return transaction;
}

async function setGoalIdInTransaction(transactionId: string, goalId: string, userId: string): Promise<void> {
  const transaction = await getTransaction({ id: transactionId, userId });

  if (!transaction) {
    throw new CustomError(ApiError.Transaction.TRANSACTION_NOT_EXIST);
  }

  const financialGoal = await financialGoalService.getFinancialGoal({ id: goalId, userId });

  if (!financialGoal) {
    throw new CustomError(ApiError.FinancialGoal.FINANCIAL_GOAL_NOT_EXIST);
  }

  if (financialGoal.currency !== transaction.currency) {
    throw new CustomError(ApiError.Transaction.TRANSACTION_AND_GOAL_NOT_SAME_CURENCY);
  }

  if (
    (financialGoal.type === FinancialGoalsType.SPEND_LESS &&
      ![TransactionType.EXPENSE, TransactionType.INSTALLMENTS].includes(transaction.type)) ||
    (financialGoal.type === FinancialGoalsType.SAVING && ![TransactionType.SAVING].includes(transaction.type))
  ) {
    throw new CustomError(ApiError.Transaction.TRANSACTION_AND_GOAL_NOT_SAME_TYPE);
  }

  await repo().update(transactionId, { goalId });

  const currentAmount =
    Number.parseFloat(String(financialGoal.currentAmount)) + Number.parseFloat(String(transaction.amount));

  await financialGoalService.updateFinancialGoal({ currentAmount }, { id: goalId });

  await cacheInvalidateUser(userId);
}

async function getTotalSavings(userId: string): Promise<number> {
  const cached = await cacheGet<number>(userId, 'savings');
  if (cached !== null) return cached;

  const transactions = await repo().find({
    where: { userId, type: TransactionType.SAVING },
  });

  const result = transactions.reduce((sum, t) => sum + Number.parseFloat(String(t.amount)), 0);

  await cacheSet(userId, 'savings', result);

  return result;
}

export const transactionService = {
  deleteTransaction,
  createTransaction,
  createInstallmentPlanWithManager,
  getTransaction,
  getAllTransactions,
  createTransactionByArray,
  getMonthsAndYears,
  calculateBalance,
  calculateBalances,
  updateTransaction,
  getBalance,
  setGoalIdInTransaction,
  getTotalSavings,
};
