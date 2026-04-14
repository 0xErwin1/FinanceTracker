import { z } from 'zod';
import { CurrencyEnum, FinancialGoalsType, MonthEnum } from '../../enums';
import { publicProcedure } from '@expenses/api';
import { isAuthenticated } from '../protected';
import { financialGoalService } from '../../services';
import { TransactionModel } from '../../models';
import { mapServiceError } from '../errors';

const createFinancialGoalSchema = z.object({
  type: z.nativeEnum(FinancialGoalsType),
  targetAmount: z.number().int().min(0),
  currency: z.nativeEnum(CurrencyEnum),
  note: z.string().optional().default(''),
  name: z.string().min(1),
  month: z.nativeEnum(MonthEnum),
  year: z.number().int().min(new Date().getFullYear()),
});

const getFinancialGoalSchema = z.object({
  goalId: z.string().uuid(),
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
        const goal = await financialGoalService.getFinancialGoal(
          { userId: ctx.userId, goalId: input.goalId },
          [{ model: TransactionModel }],
        );
        return goal;
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getAll: publicProcedure.use(isAuthenticated).query(async ({ ctx }) => {
    try {
      const goals = await financialGoalService.getAllFinancialGoals({ userId: ctx.userId }, [
        { model: TransactionModel },
      ]);
      return goals;
    } catch (error) {
      mapServiceError(error);
    }
  }),
};
