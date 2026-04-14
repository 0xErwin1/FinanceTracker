import type { NextFunction, Request, Response } from 'express';
import type { WhereOptions } from 'sequelize';
import { ApiError, TransactionType } from '../enums';
import { transactionHelper, validationHelper } from '../helpers';
import { CustomError, CustomResponse, logger } from '../lib';
import { CategoryModel, type TransactionModel } from '../models';
import { transactionService } from '../services';
import type { TransactionDTO } from '../types/DTOs';
import type { TransactionMetadata, TransactionsRedisMetadata } from '../types/redis_types';
import { CreateTransactionRequest } from '../types/request/trsactions';
import type { TransactionBalances } from '../types/response/transactions';

interface CreateTransactionBody {
  type?: string;
  amount?: number;
  currency?: string;
  note?: string;
  day?: number;
  month?: string;
  year?: number;
  exchangeRate?: number;
  goalId?: string;
  categoryId?: string;
  category?: { type?: string; name?: string };
  transactions?: Record<string, unknown>[];
}

interface SetGoalBody {
  goalId: string;
}

async function createTransaction(
  req: Request<Record<string, never>, unknown, CreateTransactionBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    validationHelper.checkValidation(req);

    const body = req.body;
    const userId = res.locals.userId as string;

    let newTransaction: CreateTransactionRequest | CreateTransactionRequest[];

    logger.debug({
      body,
    });

    const { transactions } = body;

    if (Array.isArray(transactions)) {
      newTransaction = transactions.map(
        (value) =>
          new CreateTransactionRequest({
            ...value,
            userId,
          } as import('../types/request/trsactions').BodyRequest),
      );
    } else {
      newTransaction = new CreateTransactionRequest({
        ...body,
        userId,
      } as import('../types/request/trsactions').BodyRequest);
    }

    const transaction = await transactionService.createTransactionByArray(newTransaction);

    await transactionService.deleteTransactionsInRedis(userId);
    await transactionService.deleteBalanceTransactionInRedis(userId);

    res.send(new CustomResponse(true, transaction));
  } catch (err) {
    next(err);
  }
}

async function getTransactionById(
  req: Request<{ transactionId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    validationHelper.checkValidation(req);

    const { transactionId } = req.params;
    const userId = res.locals.userId as string;

    const transaction = await transactionService.getTrasaction(
      {
        transactionId,
        userId,
      },
      [
        {
          model: CategoryModel,
        },
      ],
    );

    if (!transaction) {
      throw new CustomError(ApiError.Transaction.TRANSACTION_NOT_EXIST);
    }

    res.send(new CustomResponse(true, transaction));
  } catch (err) {
    next(err);
  }
}

interface TransactionQuery {
  [key: string]: string | undefined;
  type?: string;
  month?: string;
  day?: string;
  year?: string;
}

async function getAllTransactionsByUserId(
  req: Request<Record<string, never>, unknown, Record<string, never>, TransactionQuery>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    validationHelper.checkValidation(req);

    const where = transactionHelper.getQueryInGetTransaction(req, res);

    const transationsInRedis = await transactionService.getTransactionsInRedis(where.userId);

    if (transationsInRedis && transactionHelper.queryIsEqualToData(transationsInRedis, where)) {
      res.send(new CustomResponse(true, transationsInRedis.object));
      return;
    }

    const transactions = await transactionService.getAllTrasactions(where as WhereOptions<TransactionModel>, [
      {
        model: CategoryModel,
      },
    ]);

    await transactionService.setTransactionsInRedis(transactions, where.userId, where as TransactionMetadata);

    res.send(new CustomResponse(true, transactions));
  } catch (err) {
    next(err);
  }
}

async function getTransactionBalance(
  req: Request<Record<string, never>, unknown, Record<string, never>, TransactionQuery>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    validationHelper.checkValidation(req);

    const where = transactionHelper.getQueryInGetTransaction(req, res);

    const balanceInRedis: TransactionsRedisMetadata<TransactionBalances> | null =
      await transactionService.getBalanceTransactionInRedis(where.userId);

    if (balanceInRedis && transactionHelper.queryIsEqualToData(balanceInRedis, where)) {
      res.send(new CustomResponse(true, balanceInRedis.object));
      return;
    }

    const transactions = await transactionService.getBalance(where.month);

    await transactionService.setBalanceTransactionInRedis(
      transactions,
      where.userId,
      where as TransactionMetadata,
    );

    res.send(new CustomResponse(true, transactions));
  } catch (err) {
    next(err);
  }
}

async function deleteTrasactions(
  req: Request<{ transactionId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    validationHelper.checkValidation(req);

    const { transactionId } = req.params;

    await transactionService.deleteTransaction(transactionId);

    res.send(new CustomResponse(true));
  } catch (err) {
    next(err);
  }
}

async function getMonthsAndYears(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = res.locals.userId as string;

    const monthByYear = await transactionService.getMonthsAndYears(userId);

    res.send(new CustomResponse(true, monthByYear));
  } catch (err) {
    next(err);
  }
}

async function getTotalSavings(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = res.locals.userId as string;

    const total = await transactionService.getAllTrasactions({
      userId,
      type: TransactionType.SAVING,
    });

    const totalSavings = total.reduce(
      (acc: number, transaction: TransactionDTO) => acc + transaction.amount,
      0,
    );

    res.send(
      new CustomResponse(true, {
        totalSavings,
      }),
    );
  } catch (err) {
    next(err);
  }
}

async function setGoalIdInTrnasaction(
  req: Request<{ transactionId: string }, unknown, SetGoalBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    validationHelper.checkValidation(req);

    const userId = res.locals.userId as string;
    const { goalId } = req.body;
    const { transactionId } = req.params;

    await transactionService.setGoalIdInTransaction(transactionId, goalId, userId);

    res.send(new CustomResponse(true));
  } catch (err) {
    next(err);
  }
}

export const transactionController = {
  createTransaction,
  getTransactionById,
  getAllTransactionsByUserId,
  getTransactionBalance,
  deleteTrasactions,
  getMonthsAndYears,
  getTotalSavings,
  setGoalIdInTrnasaction,
};
