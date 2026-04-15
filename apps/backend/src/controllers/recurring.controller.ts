import { TRPCError } from '@trpc/server';
import type { CurrencyEnum, TransactionType } from '../enums';
import { recurringService } from '../services';
import { mapServiceError } from '../trpc/errors';

export const recurringController = {
  async create(
    input: {
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
    },
    userId: string,
  ) {
    try {
      return await recurringService.createRecurring({ ...input, userId });
    } catch (error) {
      mapServiceError(error);
    }
  },

  async update(
    input: {
      id: string;
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
    },
    userId: string,
  ) {
    try {
      const { id, ...data } = input;
      return await recurringService.updateRecurring(id, userId, data);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async delete(input: { id: string }, userId: string) {
    try {
      await recurringService.deleteRecurring(input.id, userId);
      return { success: true };
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getById(input: { id: string }, userId: string) {
    try {
      const recurring = await recurringService.getRecurring(input.id, userId);

      if (!recurring) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recurring transaction not found' });
      }

      return recurring;
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getAll(input: { active?: boolean }, userId: string) {
    try {
      return await recurringService.getAllRecurring(userId, input.active);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async pause(input: { id: string }, userId: string) {
    try {
      return await recurringService.pauseRecurring(input.id, userId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async resume(input: { id: string }, userId: string) {
    try {
      return await recurringService.resumeRecurring(input.id, userId);
    } catch (error) {
      mapServiceError(error);
    }
  },
};
