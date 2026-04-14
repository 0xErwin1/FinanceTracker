import type { Request, Response } from 'express';
import { MonthEnum, TransactionType } from '../enums';
import type { TransactionDTO } from '../types/DTOs';
import type { TransactionMetadata, TransactionsRedisMetadata } from '../types/redis_types';
import type { TransactionBalances } from '../types/response/transactions';
import { dayHelper } from './day.helper';

interface TransactionQuery {
  userId: string;
  type?: TransactionType;
  day?: number;
  month?: MonthEnum;
  year?: number;
}

function getQueryInGetTransaction(req: Request, { locals }: Response): TransactionQuery {
  const where: TransactionQuery = {
    userId: locals.userId as string,
  };

  if (req.query.type) {
    const typeKey = req.query.type as string;
    if (typeKey in TransactionType) {
      where.type = TransactionType[typeKey as keyof typeof TransactionType];
    }
  }

  if (req.query.month) {
    const monthKey = req.query.month as string;
    if (monthKey in MonthEnum) {
      where.month = MonthEnum[monthKey as keyof typeof MonthEnum];
    }
  }

  if (req.query.day) {
    where.day = +req.query.day;
  }

  if (req.query.year) {
    where.year = +req.query.year;
  }

  return where;
}

function queryIsEqualToData(
  object: TransactionsRedisMetadata<TransactionDTO[] | TransactionBalances> | null,
  where: TransactionMetadata,
): boolean {
  return (
    !!object?.metadata &&
    object.metadata.type === where?.type &&
    object.metadata.day === where?.day &&
    object.metadata.month === where?.month &&
    object.metadata.year === where?.year
  );
}

export const transactionHelper = {
  getQueryInGetTransaction,
  queryIsEqualToData,
};
