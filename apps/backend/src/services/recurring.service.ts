import { AppDataSource } from '../data-source';
import { RecurringTransaction } from '../entities';
import type { CurrencyEnum, TransactionType } from '../enums';
import { ApiError } from '../enums';
import { CustomError, cacheInvalidateUser } from '../lib';
import { scheduleRecurringJob, unscheduleRecurringJob } from '../queues';
import type { RecurringTransactionDTO } from '../types/DTOs';

const repo = () => AppDataSource.getRepository(RecurringTransaction);

interface CreateRecurringInput {
  userId: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyEnum;
  categoryId?: string;
  note?: string;
  dayOfMonth: number;
  startDate: string;
  endDate?: string;
  exchangeRate?: number;
  goalId?: string;
}

interface UpdateRecurringInput {
  type?: TransactionType;
  amount?: number;
  currency?: CurrencyEnum;
  categoryId?: string | null;
  note?: string | null;
  dayOfMonth?: number;
  startDate?: string;
  endDate?: string | null;
  exchangeRate?: number | null;
  goalId?: string | null;
}

async function createRecurring(input: CreateRecurringInput): Promise<RecurringTransactionDTO> {
  if (input.dayOfMonth < 1 || input.dayOfMonth > 31) {
    throw new CustomError(ApiError.RecurringTransaction.INVALID_DAY_OF_MONTH);
  }

  const template = repo().create({
    ...input,
    active: true,
    categoryId: input.categoryId ?? null,
    note: input.note ?? null,
    endDate: input.endDate ?? null,
    exchangeRate: input.exchangeRate ?? null,
    goalId: input.goalId ?? null,
  });

  await repo().save(template);

  await scheduleRecurringJob(template);

  await cacheInvalidateUser(input.userId);

  return template;
}

async function updateRecurring(
  id: string,
  userId: string,
  data: UpdateRecurringInput,
): Promise<RecurringTransactionDTO> {
  const template = await repo().findOne({ where: { id, userId } });

  if (!template) {
    throw new CustomError(ApiError.RecurringTransaction.NOT_EXIST);
  }

  if (data.dayOfMonth !== undefined && (data.dayOfMonth < 1 || data.dayOfMonth > 31)) {
    throw new CustomError(ApiError.RecurringTransaction.INVALID_DAY_OF_MONTH);
  }

  Object.assign(template, data);
  await repo().save(template);

  if (template.active) {
    await scheduleRecurringJob(template);
  }

  await cacheInvalidateUser(userId);

  return template;
}

async function deleteRecurring(id: string, userId: string): Promise<void> {
  const template = await repo().findOne({ where: { id, userId } });

  if (!template) {
    throw new CustomError(ApiError.RecurringTransaction.NOT_EXIST);
  }

  await repo().softDelete(id);
  await unscheduleRecurringJob(id);

  await cacheInvalidateUser(userId);
}

async function getRecurring(id: string, userId: string): Promise<RecurringTransactionDTO | null> {
  return repo().findOne({ where: { id, userId } });
}

async function getAllRecurring(userId: string, active?: boolean): Promise<RecurringTransactionDTO[]> {
  const where: Record<string, unknown> = { userId };
  if (active !== undefined) {
    where.active = active;
  }

  return repo().find({ where, order: { createdAt: 'DESC' } });
}

async function pauseRecurring(id: string, userId: string): Promise<RecurringTransactionDTO> {
  const template = await repo().findOne({ where: { id, userId } });

  if (!template) {
    throw new CustomError(ApiError.RecurringTransaction.NOT_EXIST);
  }

  template.active = false;
  await repo().save(template);
  await unscheduleRecurringJob(id);

  await cacheInvalidateUser(userId);

  return template;
}

async function resumeRecurring(id: string, userId: string): Promise<RecurringTransactionDTO> {
  const template = await repo().findOne({ where: { id, userId } });

  if (!template) {
    throw new CustomError(ApiError.RecurringTransaction.NOT_EXIST);
  }

  template.active = true;
  await repo().save(template);
  await scheduleRecurringJob(template);

  await cacheInvalidateUser(userId);

  return template;
}

export const recurringService = {
  createRecurring,
  updateRecurring,
  deleteRecurring,
  getRecurring,
  getAllRecurring,
  pauseRecurring,
  resumeRecurring,
};
