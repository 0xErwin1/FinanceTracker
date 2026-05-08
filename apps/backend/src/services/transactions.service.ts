import { randomUUID } from 'node:crypto';
import { Between, type EntityManager } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Transaction } from '../entities';
import { ApiError, CurrencyEnum, FinancialGoalsType, TransactionType } from '../enums';
import { CustomError, cacheGet, cacheInvalidateUser, cacheSet, logger } from '../lib';
import type { CategoryDTO, TransactionDTO } from '../types/DTOs';
import type { Balances, TransactionBalances } from '../types/response/transactions';
import { accountService, categoryService, financialGoalService } from '.';

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
  recurringTransactionId?: string;
  obligationId?: string;
  accountId?: string;
  transferGroupId?: string;
  transferDirection?: 'OUTGOING' | 'INCOMING';
  counterpartyAccountId?: string;
  disableCategoryAutoCreate?: boolean;
  importMetadata?: {
    batchId: string;
    fingerprint: string;
    source: string;
    externalReference?: string | null;
  };
}

interface CreateTransferInput {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  currency: CurrencyEnum;
  date: string;
  userId: string;
  note?: string;
}

interface UpdateTransferInput extends CreateTransferInput {
  transactionId: string;
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

async function createTransactionWithManager(
  em: EntityManager,
  input: TransactionInput,
): Promise<TransactionDTO> {
  if (!input.accountId) {
    throw new CustomError(ApiError.Transaction.ACCOUNT_REQUIRED);
  }

  const accountValidator =
    input.transferGroupId && input.transferDirection === 'INCOMING'
      ? accountService.getTransferDestinationAccount
      : accountService.getPostingAccount;

  await accountValidator(input.accountId, input.userId, input.currency);

  if (input.counterpartyAccountId) {
    await accountService.getTransferDestinationAccount(
      input.counterpartyAccountId,
      input.userId,
      input.currency,
    );
  }

  let category: CategoryDTO | null;

  if (input.categoryId) {
    category = await categoryService.getCategory({
      id: input.categoryId,
      userId: input.userId,
    });

    logger.debug({ category });

    if (!category) {
      throw new CustomError(ApiError.Category.CATEGORY_NOT_EXIST);
    }

    if (category.type !== input.type) {
      const error = new CustomError(ApiError.Category.CATEGORY_TYPE_MISMATCH);
      error.message = `Category '${category.name}' is for ${category.type} transactions, not ${input.type}`;
      throw error;
    }
  } else if (input.disableCategoryAutoCreate) {
    category = null;
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
    externalReference: input.importMetadata?.externalReference ?? null,
    date: input.date,
    exchangeRate: input.exchangeRate ?? null,
    userId: input.userId,
    accountId: input.accountId,
    categoryId: category?.id ?? null,
    goalId: input.goalId ?? null,
    recurringTransactionId: input.recurringTransactionId ?? null,
    obligationId: input.obligationId ?? null,
    transferGroupId: input.transferGroupId ?? null,
    transferDirection: input.transferDirection ?? null,
    counterpartyAccountId: input.counterpartyAccountId ?? null,
    importSource: input.importMetadata?.source ?? null,
    importBatchId: input.importMetadata?.batchId ?? null,
    importFingerprint: input.importMetadata?.fingerprint ?? null,
  });

  await em.save(transaction);

  await cacheInvalidateUser(input.userId);

  return transaction;
}

async function validateTransferAccounts(
  sourceAccountId: string,
  destinationAccountId: string,
  userId: string,
  currency: CurrencyEnum,
) {
  if (!sourceAccountId || !destinationAccountId) {
    throw new CustomError(ApiError.Transaction.TRANSFER_ACCOUNT_REQUIRED);
  }

  if (sourceAccountId === destinationAccountId) {
    throw new CustomError(ApiError.Transaction.TRANSFER_ACCOUNTS_MUST_DIFFER);
  }

  const sourceAccount = await accountService.getTransferSourceAccount(sourceAccountId, userId);
  const destinationAccount = await accountService.getTransferDestinationAccount(destinationAccountId, userId);

  if (sourceAccount.currency !== destinationAccount.currency || sourceAccount.currency !== currency) {
    const error = new CustomError(ApiError.Transaction.TRANSFER_CURRENCY_MISMATCH);
    error.message =
      'Cross-currency transfers are not supported in v1. Keep both transfer accounts in the same currency.';
    throw error;
  }

  return { sourceAccount, destinationAccount };
}

async function getTransferPairWithManager(
  em: EntityManager,
  transactionId: string,
  userId: string,
): Promise<{ outgoing: Transaction; incoming: Transaction }> {
  const transactionRepo = em.getRepository(Transaction);

  const transaction = await transactionRepo.findOne({
    where: { id: transactionId, userId },
  });

  if (!transaction) {
    throw new CustomError(ApiError.Transaction.TRANSACTION_NOT_EXIST);
  }

  if (!transaction.transferGroupId) {
    throw new CustomError(ApiError.Transaction.TRANSFER_NOT_EXIST);
  }

  const pair = await transactionRepo.find({
    where: {
      userId,
      transferGroupId: transaction.transferGroupId,
    },
    order: { createdAt: 'ASC' },
  });

  if (pair.length !== 2) {
    throw new CustomError(ApiError.Transaction.TRANSFER_PAIR_INVALID);
  }

  const outgoing = pair.find((item) => item.transferDirection === 'OUTGOING');
  const incoming = pair.find((item) => item.transferDirection === 'INCOMING');

  if (!outgoing || !incoming) {
    throw new CustomError(ApiError.Transaction.TRANSFER_PAIR_INVALID);
  }

  return { outgoing, incoming };
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

  switch (transaction.currency) {
    case CurrencyEnum.UYU:
      balances.uyu += amount;
      break;
    case CurrencyEnum.USD:
      balances.usd += amount;
      break;
    case CurrencyEnum.EUR:
      balances.eur += amount;
      break;
  }

  balances.eur = +balances.eur.toFixed(2);
  balances.usd = +balances.usd.toFixed(2);
  balances.uyu = +balances.uyu.toFixed(2);
}

function finalizeBalanceTotal(balances: Balances): void {
  const nativeAmounts = [balances.eur, balances.usd, balances.uyu].filter((amount) => amount !== 0);

  if (nativeAmounts.length <= 1) {
    balances.total = +(balances.eur + balances.usd + balances.uyu).toFixed(2);
    return;
  }

  balances.total = 0;
}

function calculateBalances(transactions: TransactionDTO[]): TransactionBalances {
  const expenses: Balances = { total: 0, eur: 0, usd: 0, uyu: 0 };
  const incomes: Balances = { total: 0, eur: 0, usd: 0, uyu: 0 };
  const savings: Balances = { total: 0, eur: 0, usd: 0, uyu: 0 };

  for (const transaction of transactions) {
    if (transaction.transferGroupId) {
      continue;
    }

    switch (transaction.type) {
      case TransactionType.EXPENSE:
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

  finalizeBalanceTotal(expenses);
  finalizeBalanceTotal(incomes);
  finalizeBalanceTotal(savings);

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

    if (!Object.hasOwn(monthByYear, yearKey)) {
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

  if (data.accountId) {
    await accountService.getPostingAccount(
      data.accountId,
      transaction.userId,
      data.currency ?? transaction.currency,
    );
  }

  Object.assign(transaction, data);
  await repo().save(transaction);

  await cacheInvalidateUser(transaction.userId);

  return transaction;
}

async function createTransfer(input: CreateTransferInput): Promise<TransactionDTO[]> {
  await validateTransferAccounts(
    input.sourceAccountId,
    input.destinationAccountId,
    input.userId,
    input.currency,
  );

  return AppDataSource.transaction(async (em) => {
    const transferGroupId = randomUUID();

    const outgoing = await createTransactionWithManager(em, {
      type: TransactionType.EXPENSE,
      amount: input.amount,
      currency: input.currency,
      date: input.date,
      note: input.note,
      userId: input.userId,
      accountId: input.sourceAccountId,
      transferGroupId,
      transferDirection: 'OUTGOING',
      counterpartyAccountId: input.destinationAccountId,
      category: { name: 'Transfer Out', type: TransactionType.EXPENSE },
    });

    const incoming = await createTransactionWithManager(em, {
      type: TransactionType.INCOME,
      amount: input.amount,
      currency: input.currency,
      date: input.date,
      note: input.note,
      userId: input.userId,
      accountId: input.destinationAccountId,
      transferGroupId,
      transferDirection: 'INCOMING',
      counterpartyAccountId: input.sourceAccountId,
      category: { name: 'Transfer In', type: TransactionType.INCOME },
    });

    return [outgoing, incoming];
  });
}

async function updateTransfer(input: UpdateTransferInput): Promise<TransactionDTO[]> {
  await validateTransferAccounts(
    input.sourceAccountId,
    input.destinationAccountId,
    input.userId,
    input.currency,
  );

  return AppDataSource.transaction(async (em) => {
    const { outgoing, incoming } = await getTransferPairWithManager(em, input.transactionId, input.userId);

    Object.assign(outgoing, {
      amount: input.amount,
      currency: input.currency,
      date: input.date,
      note: input.note ?? '',
      accountId: input.sourceAccountId,
      counterpartyAccountId: input.destinationAccountId,
    });

    Object.assign(incoming, {
      amount: input.amount,
      currency: input.currency,
      date: input.date,
      note: input.note ?? '',
      accountId: input.destinationAccountId,
      counterpartyAccountId: input.sourceAccountId,
    });

    const saved = await em.save([outgoing, incoming]);

    await cacheInvalidateUser(input.userId);

    return saved.sort((left, right) => {
      if (left.transferDirection === right.transferDirection) {
        return left.createdAt.getTime() - right.createdAt.getTime();
      }

      return left.transferDirection === 'OUTGOING' ? -1 : 1;
    });
  });
}

async function setGoalIdInTransaction(transactionId: string, goalId: string, userId: string): Promise<void> {
  const transaction = await getTransaction({ id: transactionId, userId });

  if (!transaction) {
    throw new CustomError(ApiError.Transaction.TRANSACTION_NOT_EXIST);
  }

  if (transaction.transferGroupId) {
    throw new CustomError(ApiError.Transaction.TRANSFER_GOAL_NOT_ALLOWED);
  }

  const financialGoal = await financialGoalService.getFinancialGoal({ id: goalId, userId });

  if (!financialGoal) {
    throw new CustomError(ApiError.FinancialGoal.FINANCIAL_GOAL_NOT_EXIST);
  }

  if (financialGoal.currency !== transaction.currency) {
    throw new CustomError(ApiError.Transaction.TRANSACTION_AND_GOAL_NOT_SAME_CURENCY);
  }

  if (
    (financialGoal.type === FinancialGoalsType.SPEND_LESS && transaction.type !== TransactionType.EXPENSE) ||
    (financialGoal.type === FinancialGoalsType.SAVING && transaction.type !== TransactionType.SAVING)
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
  createTransactionWithManager,
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
  createTransfer,
  updateTransfer,
};
