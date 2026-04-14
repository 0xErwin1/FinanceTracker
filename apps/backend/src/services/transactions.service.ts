import type { IncludeOptions, Transaction, WhereOptions } from 'sequelize';
import { categoryService, financialGoalService } from '.';
import { ApiError, CurrencyEnum, FinancialGoalsType, MonthEnum, TransactionType } from '../enums';
import { CustomError, logger } from '../lib';
import { CategoryModel, FinancialGoalModel, TransactionModel, sequelize } from '../models';
import { redisClient } from '../redis';
import type { CategoryDTO, TransactionDTO } from '../types/DTOs';
import { type TransactionMetadata, TransactionsRedisMetadata } from '../types/redis_types';
import type { Balances, TransactionBalances } from '../types/response/transactions';

interface TransactionInput {
  type: TransactionType;
  amount: number;
  day?: number;
  month: MonthEnum;
  year: number;
  currency: CurrencyEnum;
  note?: string;
  exchangeRate?: number;
  userId: string;
  categoryId?: string;
  category?: { type?: TransactionType; name?: string };
  goalId?: string;
}

function toPlain(model: TransactionModel | null): TransactionDTO | null {
  if (!model) return null;
  return model.get({ plain: true }) as unknown as TransactionDTO;
}

function toPlainList(models: TransactionModel[]): TransactionDTO[] {
  return models.map((m) => m.get({ plain: true }) as unknown as TransactionDTO);
}

async function deleteTransaction(transactionId: string): Promise<void> {
  const transaction = await getTrasaction(
    {
      transactionId,
    },
    [
      {
        model: FinancialGoalModel,
      },
    ],
  );

  if (!transaction) {
    throw new CustomError(ApiError.Transaction.TRANSACTION_NOT_EXIST);
  }

  if (transaction?.goalId) {
    await financialGoalService.updateFinancialGoal(
      {
        currentAmount: transaction.financialGoal.currentAmount - transaction.amount,
      },
      {
        goalId: transaction.goalId,
      },
    );

    await updateTransaction(
      {
        goalId: null as unknown as string,
      },
      {
        transactionId,
      },
    );
  }

  await TransactionModel.destroy({
    where: {
      transactionId,
    },
  });
}

async function createTransactionByArray(
  newTransaction: TransactionInput | TransactionInput[],
): Promise<TransactionDTO | TransactionDTO[]> {
  const t = await sequelize().transaction();
  try {
    if (Array.isArray(newTransaction)) {
      const transactionCreated: TransactionDTO[] = [];

      for (const transactionData of newTransaction) {
        const data = await createTransaction(transactionData, t, false);

        transactionCreated.push(data);
      }

      await t.commit();

      return transactionCreated;
    }
    return await createTransaction(newTransaction);
  } catch (err) {
    t.rollback();
    throw err;
  }
}

async function createTransaction(
  newTransaction: TransactionInput,
  sequelizeTransaction: Transaction | undefined = undefined,
  commit = true,
): Promise<TransactionDTO> {
  const t = sequelizeTransaction ?? (await sequelize().transaction());

  try {
    let category: CategoryDTO | null;
    if (newTransaction.categoryId) {
      category = await categoryService.getCategory(
        {
          categoryId: newTransaction.categoryId,
          type: newTransaction.type,
          userId: newTransaction.userId,
        },
        [],
        { transaction: t },
      );

      logger.debug({
        category,
      });

      if (!category) {
        throw new CustomError(ApiError.Category.CATEGORY_NOT_EXIST);
      }

      if (category.type !== newTransaction.type) {
        throw new CustomError(ApiError.Transaction.TRANSACTION_AND_CATEGORY_NOT_SAME_TYPE);
      }
    } else {
      if (newTransaction.category?.type && newTransaction.category.type !== newTransaction.type) {
        throw new CustomError(ApiError.Transaction.TRANSACTION_AND_CATEGORY_NOT_SAME_TYPE);
      }

      const type = newTransaction.category?.type ? newTransaction.category.type : newTransaction.type;

      category = await categoryService.createCategory(
        {
          ...newTransaction.category,
          type,
          userId: newTransaction.userId,
          note: '',
          name: newTransaction.category?.name ?? '',
        },
        {
          transaction: t,
          commit: false,
        },
      );
    }

    const transactionData = {
      ...newTransaction,
      category: undefined,
      categoryId: category.categoryId,
    };

    const transactionCreated: TransactionModel = await TransactionModel.create(
      {
        type: transactionData.type,
        amount: transactionData.amount,
        day: transactionData.day ?? new Date().getDate(),
        month: transactionData.month,
        year: transactionData.year,
        currency: transactionData.currency,
        note: transactionData.note ?? '',
        userId: transactionData.userId,
        categoryId: transactionData.categoryId,
        exchangeRate: transactionData.exchangeRate ?? null,
        // biome-ignore lint/suspicious/noExplicitAny: Sequelize create() type mismatch with plain data
      } as any,
      {
        include: [
          {
            model: CategoryModel,
          },
        ],
        transaction: t,
      },
    );

    if (commit) {
      await t.commit();
    }

    const plainResult = toPlain(transactionCreated);
    if (!plainResult) {
      throw new Error('Failed to create transaction');
    }

    return plainResult;
  } catch (err) {
    if (commit) {
      await t.rollback();
    }

    throw err;
  }
}

async function getBalance(month: MonthEnum | undefined): Promise<TransactionBalances> {
  const transactions = await getAllTrasactions(
    month
      ? {
          month,
        }
      : {},
    [],
  );

  return calculateBalances(transactions);
}

function calculateBalance(transaction: TransactionDTO, balances: Balances): void {
  switch (transaction.currency) {
    case CurrencyEnum.UYU:
      balances.uyu += transaction.amount;
      balances.total += transaction.amount;
      break;
    case CurrencyEnum.USD:
      balances.usd += transaction.amount;
      balances.total += transaction.amount * transaction.exchangeRate;
      break;
    case CurrencyEnum.EUR:
      balances.eur += transaction.amount;
      balances.total += transaction.amount * transaction.exchangeRate;
      break;
  }

  balances.total = +balances.total.toFixed(2);
  balances.eur = +balances.eur.toFixed(2);
  balances.usd = +balances.usd.toFixed(2);
  balances.uyu = +balances.uyu.toFixed(2);
}

function calculateBalances(transactions: TransactionDTO[]): TransactionBalances {
  const expenses: Balances = {
    total: 0,
    eur: 0,
    usd: 0,
    uyu: 0,
  };

  const incomes: Balances = {
    total: 0,
    eur: 0,
    usd: 0,
    uyu: 0,
  };

  const savings: Balances = {
    total: 0,
    eur: 0,
    usd: 0,
    uyu: 0,
  };

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

  return {
    expenses,
    incomes,
    savings,
  };
}

async function getAllTrasactions(
  where: WhereOptions<TransactionModel>,
  include: IncludeOptions[] = [],
): Promise<TransactionDTO[]> {
  const trasactions = await TransactionModel.findAll({
    where,
    include,
  });

  return toPlainList(trasactions);
}

async function getTrasaction(
  where: WhereOptions<TransactionModel>,
  include: IncludeOptions[] = [],
): Promise<TransactionDTO | null> {
  const trasaction = await TransactionModel.findOne({
    where,
    include,
  });

  return toPlain(trasaction);
}

type MonthByYear = Record<string, string[]>;

async function getMonthsAndYears(userId: string): Promise<MonthByYear> {
  const transactions = await TransactionModel.findAll({
    where: {
      userId,
    },
    attributes: ['month', 'year'],
  });

  const monthByYear: MonthByYear = {};

  for (const value of transactions) {
    const yearKey = String(value.year);
    if (!Object.prototype.hasOwnProperty.call(monthByYear, yearKey)) {
      monthByYear[yearKey] = [];
    }

    if (!monthByYear[yearKey].includes(value.month)) {
      monthByYear[yearKey].push(value.month);
    }

    monthByYear[yearKey].sort(
      (a: string, b: string) =>
        Object.values(MonthEnum).indexOf(a as MonthEnum) - Object.values(MonthEnum).indexOf(b as MonthEnum),
    );
  }

  return monthByYear;
}

async function updateTransaction<T extends object>(
  newTransaction: T,
  where: WhereOptions<TransactionModel>,
): Promise<TransactionDTO> {
  const transactions = await getAllTrasactions(where, []);

  if (!transactions) {
    throw new CustomError(ApiError.Transaction.TRANSACTION_NOT_EXIST);
  }

  const updated = await TransactionModel.update(newTransaction as Partial<TransactionModel>, {
    where,
    returning: true,
  });

  return (updated as [number, TransactionModel[]])[1][0].get({ plain: true }) as unknown as TransactionDTO;
}

async function setGoalIdInTransaction(transactionId: string, goalId: string, userId: string): Promise<void> {
  const transaction = await getTrasaction(
    {
      transactionId,
      goalId: null as unknown as string,
    },
    [],
  );

  if (!transaction) {
    throw new CustomError(ApiError.Transaction.TRANSACTION_NOT_EXIST);
  }

  const financialGoal = await financialGoalService.getFinancialGoal(
    {
      goalId,
      userId,
    },
    [],
  );

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

  await TransactionModel.update(
    {
      goalId,
    },
    {
      where: {
        userId,
        transactionId,
      },
    },
  );

  const currentAmount = financialGoal.currentAmount + transaction.amount;

  await financialGoalService.updateFinancialGoal(
    {
      currentAmount,
    },
    {
      goalId,
    },
  );
}

async function getTransactionsInRedis(
  userId: string,
): Promise<TransactionsRedisMetadata<TransactionDTO[]> | null> {
  const transactions: string | null = await redisClient.get(`transactions:${userId}`);

  return transactions ? JSON.parse(transactions) : null;
}

async function setTransactionsInRedis(
  transactions: TransactionDTO[],
  userId: string,
  metadata: TransactionMetadata,
): Promise<void> {
  await redisClient.set(
    `transactions:${userId}`,
    JSON.stringify(new TransactionsRedisMetadata(transactions, metadata)),
    {
      EX: 30 * 60 * 1000, // 30 min
    },
  );
}

async function getBalanceTransactionInRedis(
  userId: string,
): Promise<TransactionsRedisMetadata<TransactionBalances> | null> {
  const balance: string | null = await redisClient.get(`balances:${userId}`);

  return balance ? JSON.parse(balance) : null;
}

async function setBalanceTransactionInRedis(
  transactions: TransactionBalances,
  userId: string,
  metadata: TransactionMetadata,
): Promise<void> {
  await redisClient.set(
    `balances:${userId}`,
    JSON.stringify(new TransactionsRedisMetadata(transactions, metadata)),
    {
      EX: 30 * 60 * 1000, // 30 min
    },
  );
}

async function deleteTransactionsInRedis(userId: string): Promise<void> {
  await redisClient.del(`transactions:${userId}`);
}

async function deleteBalanceTransactionInRedis(userId: string): Promise<void> {
  await redisClient.del(`balances:${userId}`);
}

export const transactionService = {
  deleteTransaction,
  createTransaction,
  getTrasaction,
  getAllTrasactions,
  createTransactionByArray,
  getMonthsAndYears,
  calculateBalance,
  calculateBalances,
  updateTransaction,
  getBalance,
  setGoalIdInTransaction,
  getTransactionsInRedis,
  setTransactionsInRedis,
  getBalanceTransactionInRedis,
  setBalanceTransactionInRedis,
  deleteTransactionsInRedis,
  deleteBalanceTransactionInRedis,
};
