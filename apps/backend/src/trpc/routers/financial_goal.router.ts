import { publicProcedure } from '@expenses/api';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { CurrencyEnum, FinancialGoalsType } from '../../enums';
import { financialGoalService } from '../../services';
import { mapServiceError } from '../errors';
import { isAuthenticated } from '../protected';

const createFinancialGoalSchema = z.object({
  type: z.nativeEnum(FinancialGoalsType),
  targetAmount: z.number().min(0),
  currency: z.nativeEnum(CurrencyEnum),
  note: z.string().optional().default(''),
  name: z.string().min(1),
  targetDate: z.string(),
});

const getFinancialGoalSchema = z.object({
  id: z.string().uuid(),
});

export const financialGoalRouter = {
  create: publicProcedure
    .use(isAuthenticated)
    .input(createFinancialGoalSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const goal = await financialGoalService.createFinancialGoal({
          ...input,
          userId: ctx.userId,
        });
        return goal;
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getById: publicProcedure
    .use(isAuthenticated)
    .input(getFinancialGoalSchema)
    .query(async ({ input, ctx }) => {
      try {
        const goal = await financialGoalService.getFinancialGoal({ userId: ctx.userId, id: input.id }, [
          'transactions',
        ]);

        if (!goal) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Financial goal not found' });
        }

        return goal;
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getAll: publicProcedure.use(isAuthenticated).query(async ({ ctx }) => {
    try {
      const goals = await financialGoalService.getAllFinancialGoals({ userId: ctx.userId }, ['transactions']);
      return goals;
    } catch (error) {
      mapServiceError(error);
    }
  }),
};
