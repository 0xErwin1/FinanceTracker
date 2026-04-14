import { z } from 'zod';
import { CurrencyEnum, MonthEnum, TransactionType } from '../../enums';
import { publicProcedure } from '@expenses/api';
import { isAuthenticated } from '../protected';
import { transactionService } from '../../services';
import { CategoryModel } from '../../models';
import { mapServiceError } from '../errors';
import { dayHelper } from '../../helpers';

const categoryInlineSchema = z.object({
  type: z.nativeEnum(TransactionType).optional(),
  name: z.string().min(1),
});

const singleTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number(),
  currency: z.nativeEnum(CurrencyEnum),
  note: z.string().optional().default(''),
  day: z.number().int().min(1).max(31).optional(),
  month: z.nativeEnum(MonthEnum),
  year: z.number().int().min(2000),
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
  month: z.nativeEnum(MonthEnum).optional(),
  day: z.number().int().min(1).max(31).optional(),
  year: z.number().int().min(2000).optional(),
});

const getBalanceSchema = z.object({
  month: z.nativeEnum(MonthEnum).optional(),
});

const transactionIdSchema = z.object({
  transactionId: z.string().uuid(),
});

const setGoalSchema = z.object({
  transactionId: z.string().uuid(),
  goalId: z.string().uuid(),
});

export const transactionRouter = {
  create: publicProcedure
    .use(isAuthenticated)
    .input(createTransactionSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        if (input.mode === 'single') {
          const transaction = await transactionService.createTransaction({
            ...input.transaction,
            userId: ctx.userId,
          });

          await invalidateRedisCaches(ctx.userId);

          return transaction;
        }

        const transactions = await transactionService.createTransactionByArray(
          input.transactions.map((tx) => ({
            ...tx,
            userId: ctx.userId,
          })),
        );

        await invalidateRedisCaches(ctx.userId);

        return transactions;
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getById: publicProcedure
    .use(isAuthenticated)
    .input(transactionIdSchema)
    .query(async ({ input, ctx }) => {
      try {
        const transaction = await transactionService.getTrasaction(
          {
            transactionId: input.transactionId,
            userId: ctx.userId,
          },
          [{ model: CategoryModel }],
        );

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
        const where = {
          userId: ctx.userId,
          ...input,
        };

        const cached = await transactionService.getTransactionsInRedis(ctx.userId);

        if (cached && queryMatches(cached.metadata, where)) {
          return cached.object;
        }

        const transactions = await transactionService.getAllTrasactions(where, [{ model: CategoryModel }]);

        await transactionService.setTransactionsInRedis(transactions, ctx.userId, where);

        return transactions;
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getBalance: publicProcedure
    .use(isAuthenticated)
    .input(getBalanceSchema)
    .query(async ({ input, ctx }) => {
      try {
        const where = {
          userId: ctx.userId,
          ...input,
        };

        const cached = await transactionService.getBalanceTransactionInRedis(ctx.userId);

        if (cached && queryMatches(cached.metadata, where)) {
          return cached.object;
        }

        const balances = await transactionService.getBalance(input.month);

        await transactionService.setBalanceTransactionInRedis(balances, ctx.userId, where);

        return balances;
      } catch (error) {
        mapServiceError(error);
      }
    }),

  delete: publicProcedure
    .use(isAuthenticated)
    .input(transactionIdSchema)
    .mutation(async ({ input }) => {
      try {
        await transactionService.deleteTransaction(input.transactionId);
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
      const transactions = await transactionService.getAllTrasactions({
        userId: ctx.userId,
        type: TransactionType.SAVING,
      });

      const totalSavings = transactions.reduce((acc, t) => acc + t.amount, 0);
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
        await transactionService.setGoalIdInTransaction(input.transactionId, input.goalId, ctx.userId);
        return { success: true };
      } catch (error) {
        mapServiceError(error);
      }
    }),
};

function queryMatches(
  metadata: { type?: string; day?: number; month?: string; year?: number } | undefined,
  where: { type?: string; day?: number; month?: string; year?: number },
): boolean {
  if (!metadata) return false;
  return (
    metadata.type === where.type &&
    metadata.day === where.day &&
    metadata.month === where.month &&
    metadata.year === where.year
  );
}

async function invalidateRedisCaches(userId: string): Promise<void> {
  await transactionService.deleteTransactionsInRedis(userId);
  await transactionService.deleteBalanceTransactionInRedis(userId);
}
