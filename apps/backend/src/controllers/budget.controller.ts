import { TRPCError } from '@trpc/server';
import { budgetService } from '../services';
import { mapServiceError } from '../trpc/errors';

export const budgetController = {
  async create(
    input: {
      categoryId: string;
      month: string;
      amount: number;
      alertThreshold?: number;
    },
    userId: string,
  ) {
    try {
      return await budgetService.createBudget({ ...input, userId });
    } catch (error) {
      mapServiceError(error);
    }
  },

  async update(
    input: {
      id: string;
      amount?: number;
      alertThreshold?: number | null;
    },
    userId: string,
  ) {
    try {
      const { id, ...data } = input;
      return await budgetService.updateBudget(id, userId, data);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async delete(input: { id: string }, userId: string) {
    try {
      await budgetService.deleteBudget(input.id, userId);
      return { success: true };
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getById(input: { id: string }, userId: string) {
    try {
      const budget = await budgetService.getBudget(input.id, userId);

      if (!budget) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget not found' });
      }

      return budget;
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getAll(input: { month?: string }, userId: string) {
    try {
      return await budgetService.getAllBudgets(userId, input.month);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getAlerts(input: { month: string }, userId: string) {
    try {
      return await budgetService.getBudgetAlerts(userId, input.month);
    } catch (error) {
      mapServiceError(error);
    }
  },
};
