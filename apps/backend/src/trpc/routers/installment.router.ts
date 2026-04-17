import { publicProcedure } from '@expenses/api';
import { z } from 'zod';
import { CurrencyEnum } from '../../enums';
import { installmentController } from '../../controllers';
import { isAuthenticated } from '../protected';

const createPlanSchema = z.object({
  totalAmount: z.number().min(0),
  currency: z.nativeEnum(CurrencyEnum),
  installmentsCount: z.number().int().min(1),
  categoryId: z.string().uuid().optional(),
  note: z.string().optional(),
  startDate: z.string(),
});

const planIdSchema = z.object({
  id: z.string().uuid(),
});

const obligationIdSchema = z.object({
  obligationId: z.string().uuid(),
});

const emptySchema = z.object({});

export const installmentRouter = {
  createPlan: publicProcedure
    .use(isAuthenticated)
    .input(createPlanSchema)
    .mutation(({ input, ctx }) => installmentController.createPlan(input, ctx.userId)),

  getPlan: publicProcedure
    .use(isAuthenticated)
    .input(planIdSchema)
    .query(({ input, ctx }) => installmentController.getPlan(input, ctx.userId)),

  getAllPlans: publicProcedure
    .use(isAuthenticated)
    .input(emptySchema)
    .query(({ input, ctx }) => installmentController.getAllPlans(input, ctx.userId)),

  payObligation: publicProcedure
    .use(isAuthenticated)
    .input(obligationIdSchema)
    .mutation(({ input, ctx }) => installmentController.payObligation(input, ctx.userId)),

  skipObligation: publicProcedure
    .use(isAuthenticated)
    .input(obligationIdSchema)
    .mutation(({ input, ctx }) => installmentController.skipObligation(input, ctx.userId)),

  deletePlan: publicProcedure
    .use(isAuthenticated)
    .input(planIdSchema)
    .mutation(({ input, ctx }) => installmentController.deletePlan(input, ctx.userId)),
};
