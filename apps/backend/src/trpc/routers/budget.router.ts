import { publicProcedure } from '@expenses/api';
import { z } from 'zod';
import { budgetController } from '../../controllers';
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
    .mutation(({ input, ctx }) => budgetController.create(input, ctx.userId)),

  update: publicProcedure
    .use(isAuthenticated)
    .input(updateBudgetSchema)
    .mutation(({ input, ctx }) => budgetController.update(input, ctx.userId)),

  delete: publicProcedure
    .use(isAuthenticated)
    .input(budgetIdSchema)
    .mutation(({ input, ctx }) => budgetController.delete(input, ctx.userId)),

  getById: publicProcedure
    .use(isAuthenticated)
    .input(budgetIdSchema)
    .query(({ input, ctx }) => budgetController.getById(input, ctx.userId)),

  getAll: publicProcedure
    .use(isAuthenticated)
    .input(getBudgetsSchema)
    .query(({ input, ctx }) => budgetController.getAll(input, ctx.userId)),

  getAlerts: publicProcedure
    .use(isAuthenticated)
    .input(getAlertsSchema)
    .query(({ input, ctx }) => budgetController.getAlerts(input, ctx.userId)),
};
