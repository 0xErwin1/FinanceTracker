import { publicProcedure } from '@expenses/api';
import { z } from 'zod';
import { CurrencyEnum, TransactionType } from '../../enums';
import { transactionController } from '../../controllers';
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
  exchangeRate: z.number().positive().optional(),
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

const updateTransactionSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(TransactionType).optional(),
  amount: z.number().min(0).optional(),
  currency: z.nativeEnum(CurrencyEnum).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  date: z.string().optional(),
  note: z.string().nullable().optional(),
  exchangeRate: z.number().positive().nullable().optional(),
});

export const transactionRouter = {
  create: publicProcedure
    .use(isAuthenticated)
    .input(createTransactionSchema)
    .mutation(({ input, ctx }) => transactionController.create(input, ctx.userId)),

  getById: publicProcedure
    .use(isAuthenticated)
    .input(transactionIdSchema)
    .query(({ input, ctx }) => transactionController.getById(input, ctx.userId)),

  getAll: publicProcedure
    .use(isAuthenticated)
    .input(getTransactionsSchema)
    .query(({ input, ctx }) => transactionController.getAll(input, ctx.userId)),

  getBalance: publicProcedure
    .use(isAuthenticated)
    .input(getBalanceSchema)
    .query(({ input, ctx }) => transactionController.getBalance(input, ctx.userId)),

  delete: publicProcedure
    .use(isAuthenticated)
    .input(transactionIdSchema)
    .mutation(({ input, ctx }) => transactionController.delete(input, ctx.userId)),

  update: publicProcedure
    .use(isAuthenticated)
    .input(updateTransactionSchema)
    .mutation(({ input, ctx }) => transactionController.update(input, ctx.userId)),

  getMonthsAndYears: publicProcedure
    .use(isAuthenticated)
    .query(({ ctx }) => transactionController.getMonthsAndYears(ctx.userId)),

  getTotalSavings: publicProcedure
    .use(isAuthenticated)
    .query(({ ctx }) => transactionController.getTotalSavings(ctx.userId)),

  setGoal: publicProcedure
    .use(isAuthenticated)
    .input(setGoalSchema)
    .mutation(({ input, ctx }) => transactionController.setGoal(input, ctx.userId)),
};
