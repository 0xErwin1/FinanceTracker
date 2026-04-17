import { publicProcedure } from '@expenses/api';
import { z } from 'zod';
import { CurrencyEnum, FinancialGoalsType } from '../../enums';
import { financialGoalController } from '../../controllers';
import { isAuthenticated } from '../protected';

const createFinancialGoalSchema = z.object({
  type: z.nativeEnum(FinancialGoalsType),
  targetAmount: z.number().min(0),
  currency: z.nativeEnum(CurrencyEnum),
  note: z.string().optional().default(''),
  name: z.string().min(1),
  targetDate: z.string(),
});

const updateFinancialGoalSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(FinancialGoalsType).optional(),
  targetAmount: z.number().min(0).optional(),
  currency: z.nativeEnum(CurrencyEnum).optional(),
  note: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  targetDate: z.string().optional(),
  currentAmount: z.number().min(0).optional(),
});

const getFinancialGoalSchema = z.object({
  id: z.string().uuid(),
});

export const financialGoalRouter = {
  create: publicProcedure
    .use(isAuthenticated)
    .input(createFinancialGoalSchema)
    .mutation(({ input, ctx }) => financialGoalController.create(input, ctx.userId)),

  update: publicProcedure
    .use(isAuthenticated)
    .input(updateFinancialGoalSchema)
    .mutation(({ input, ctx }) => financialGoalController.update(input, ctx.userId)),

  delete: publicProcedure
    .use(isAuthenticated)
    .input(getFinancialGoalSchema)
    .mutation(({ input, ctx }) => financialGoalController.delete(input, ctx.userId)),

  getById: publicProcedure
    .use(isAuthenticated)
    .input(getFinancialGoalSchema)
    .query(({ input, ctx }) => financialGoalController.getById(input, ctx.userId)),

  getAll: publicProcedure.use(isAuthenticated).query(({ ctx }) => financialGoalController.getAll(ctx.userId)),
};
