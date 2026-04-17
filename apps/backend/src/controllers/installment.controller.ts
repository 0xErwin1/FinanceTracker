import { TRPCError } from '@trpc/server';
import type { CurrencyEnum } from '../enums';
import { installmentService, transactionService } from '../services';
import { mapServiceError } from '../trpc/errors';

export const installmentController = {
  async createPlan(
    input: {
      totalAmount: number;
      currency: CurrencyEnum;
      installmentsCount: number;
      categoryId?: string;
      note?: string;
      startDate: string;
    },
    userId: string,
  ) {
    try {
      return await installmentService.createPlan({ ...input, userId });
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getPlan(input: { id: string }, userId: string) {
    try {
      const plan = await installmentService.getPlan(input.id, userId);

      if (!plan) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Installment plan not found' });
      }

      return plan;
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getAllPlans(_input: Record<string, unknown>, userId: string) {
    try {
      return await installmentService.getAllPlans(userId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async payObligation(input: { obligationId: string }, userId: string) {
    try {
      return await installmentService.payObligation(input.obligationId, userId, transactionService);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async skipObligation(input: { obligationId: string }, userId: string) {
    try {
      return await installmentService.skipObligation(input.obligationId, userId);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async deletePlan(input: { id: string }, userId: string) {
    try {
      await installmentService.deletePlan(input.id, userId);
      return { success: true };
    } catch (error) {
      mapServiceError(error);
    }
  },
};
