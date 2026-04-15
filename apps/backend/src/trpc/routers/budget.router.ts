import { publicProcedure } from '@expenses/api';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { budgetService } from '../../services';
import { mapServiceError } from '../errors';
import { isAuthenticated } from '../protected';

const createBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  month: z.string(),
  amount: z.number().min(0),
  alertThreshold: z.number().min(0).max(100).optional(),
});

const updateBudgetSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().min(0).optional(),
  alertThreshold: z.number().min(0).max(100).nullable().optional(),
});

const budgetIdSchema = z.object({
  id: z.string().uuid(),
});

const getBudgetsSchema = z.object({
  month: z.string().optional(),
});

const getAlertsSchema = z.object({
  month: z.string(),
});

export const budgetRouter = {
  create: publicProcedure
    .use(isAuthenticated)
    .input(createBudgetSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await budgetService.createBudget({ ...input, userId: ctx.userId });
      } catch (error) {
        mapServiceError(error);
      }
    }),

  update: publicProcedure
    .use(isAuthenticated)
    .input(updateBudgetSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, ...data } = input;
        return await budgetService.updateBudget(id, ctx.userId, data);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  delete: publicProcedure
    .use(isAuthenticated)
    .input(budgetIdSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        await budgetService.deleteBudget(input.id, ctx.userId);
        return { success: true };
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getById: publicProcedure
    .use(isAuthenticated)
    .input(budgetIdSchema)
    .query(async ({ input, ctx }) => {
      try {
        const budget = await budgetService.getBudget(input.id, ctx.userId);
        if (!budget) throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget not found' });
        return budget;
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getAll: publicProcedure
    .use(isAuthenticated)
    .input(getBudgetsSchema)
    .query(async ({ input, ctx }) => {
      try {
        return await budgetService.getAllBudgets(ctx.userId, input.month);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getAlerts: publicProcedure
    .use(isAuthenticated)
    .input(getAlertsSchema)
    .query(async ({ input, ctx }) => {
      try {
        return await budgetService.getBudgetAlerts(ctx.userId, input.month);
      } catch (error) {
        mapServiceError(error);
      }
    }),
};
