import { publicProcedure } from '@expenses/api';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { CurrencyEnum, TransactionType } from '../../enums';
import { transactionService } from '../../services';
import { mapServiceError } from '../errors';
import { isAuthenticated } from '../protected';

const categoryInlineSchema = z.object({
  type: z.nativeEnum(TransactionType).optional(),
  name: z.string().min(1),
});

const singleTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().min(0),
  currency: z.nativeEnum(CurrencyEnum),
  note: z.string().optional().default(''),
  date: z.string(),
  exchangeRate: z.number().optional(),
  goalId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  category: categoryInlineSchema.optional(),
});

const createTransactionSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('single'),
    transaction: singleTransactionSchema,
  }),
  z.object({
    mode: z.literal('batch'),
    transactions: z.array(singleTransactionSchema).min(1),
  }),
]);

const getTransactionsSchema = z.object({
  type: z.nativeEnum(TransactionType).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const getBalanceSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const transactionIdSchema = z.object({
  id: z.string().uuid(),
});

const setGoalSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid(),
});

export const transactionRouter = {
  create: publicProcedure
    .use(isAuthenticated)
    .input(createTransactionSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        if (input.mode === 'single') {
          return await transactionService.createTransaction({
            ...input.transaction,
            userId: ctx.userId,
          });
        }

        return await transactionService.createTransactionByArray(
          input.transactions.map((tx) => ({
            ...tx,
            userId: ctx.userId,
          })),
        );
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getById: publicProcedure
    .use(isAuthenticated)
    .input(transactionIdSchema)
    .query(async ({ input, ctx }) => {
      try {
        const transaction = await transactionService.getTransaction(
          {
            id: input.id,
            userId: ctx.userId,
          },
          ['category'],
        );

        if (!transaction) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Transaction not found' });
        }

        return transaction;
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getAll: publicProcedure
    .use(isAuthenticated)
    .input(getTransactionsSchema)
    .query(async ({ input, ctx }) => {
      try {
        const where: Record<string, any> = { userId: ctx.userId };
        if (input.type) where.type = input.type;
        if (input.dateFrom || input.dateTo) {
          const { Between } = await import('typeorm');
          where.date = Between(input.dateFrom ?? '1970-01-01', input.dateTo ?? '2999-12-31');
        }

        return await transactionService.getAllTransactions(where);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getBalance: publicProcedure
    .use(isAuthenticated)
    .input(getBalanceSchema)
    .query(async ({ input, ctx }) => {
      try {
        return await transactionService.getBalance(ctx.userId, input.dateFrom, input.dateTo);
      } catch (error) {
        mapServiceError(error);
      }
    }),

  delete: publicProcedure
    .use(isAuthenticated)
    .input(transactionIdSchema)
    .mutation(async ({ input }) => {
      try {
        await transactionService.deleteTransaction(input.id);
        return { success: true };
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getMonthsAndYears: publicProcedure.use(isAuthenticated).query(async ({ ctx }) => {
    try {
      return await transactionService.getMonthsAndYears(ctx.userId);
    } catch (error) {
      mapServiceError(error);
    }
  }),

  getTotalSavings: publicProcedure.use(isAuthenticated).query(async ({ ctx }) => {
    try {
      const totalSavings = await transactionService.getTotalSavings(ctx.userId);
      return { totalSavings };
    } catch (error) {
      mapServiceError(error);
    }
  }),

  setGoal: publicProcedure
    .use(isAuthenticated)
    .input(setGoalSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        await transactionService.setGoalIdInTransaction(input.id, input.goalId, ctx.userId);
        return { success: true };
      } catch (error) {
        mapServiceError(error);
      }
    }),
};
