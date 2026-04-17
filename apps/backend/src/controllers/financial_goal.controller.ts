import { TRPCError } from '@trpc/server';
import { financialGoalService } from '../services';
import { mapServiceError } from '../trpc/errors';

export const financialGoalController = {
  async create(
    input: {
      type: any;
      targetAmount: number;
      currency: any;
      note?: string;
      name: string;
      targetDate: string;
    },
    userId: string,
  ) {
    try {
      const goal = await financialGoalService.createFinancialGoal({
        ...input,
        note: input.note ?? '',
        userId,
      });
      return goal;
    } catch (error) {
      mapServiceError(error);
    }
  },

  async update(
    input: {
      id: string;
      type?: any;
      targetAmount?: number;
      currency?: any;
      note?: string | null;
      name?: string;
      targetDate?: string;
      currentAmount?: number;
    },
    userId: string,
  ) {
    try {
      const { id, ...data } = input;
      return await financialGoalService.updateFinancialGoal(data, { id, userId });
    } catch (error) {
      mapServiceError(error);
    }
  },

  async delete(input: { id: string }, userId: string) {
    try {
      await financialGoalService.deleteFinancialGoal(input.id, userId);
      return { success: true };
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getById(input: { id: string }, userId: string) {
    try {
      const goal = await financialGoalService.getFinancialGoal({ userId, id: input.id }, ['transactions']);

      if (!goal) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Financial goal not found' });
      }

      return goal;
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getAll(userId: string) {
    try {
      return await financialGoalService.getAllFinancialGoals({ userId }, ['transactions']);
    } catch (error) {
      mapServiceError(error);
    }
  },
};
