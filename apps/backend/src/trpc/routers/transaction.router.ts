import { publicProcedure } from '@expenses/api';
import { z } from 'zod';
import { transactionController } from '../../controllers';
import { CurrencyEnum, TransactionType } from '../../enums';
import { isAuthenticated } from '../protected';

const categoryInlineSchema = z.object({
  type: z.nativeEnum(TransactionType).optional(),
  name: z.string().min(1),
});

const singleTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().min(0),
  currency: z.nativeEnum(CurrencyEnum),
  accountId: z.string().uuid(),
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
  accountId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const createTransferSchema = z.object({
  sourceAccountId: z.string().uuid(),
  destinationAccountId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.nativeEnum(CurrencyEnum),
  date: z.string(),
  note: z.string().optional(),
});

const updateTransferSchema = z.object({
  transactionId: z.string().uuid(),
  sourceAccountId: z.string().uuid(),
  destinationAccountId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.nativeEnum(CurrencyEnum),
  date: z.string(),
  note: z.string().optional(),
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
  accountId: z.string().uuid().nullable().optional(),
  date: z.string().optional(),
  note: z.string().nullable().optional(),
  exchangeRate: z.number().positive().nullable().optional(),
});

const importPreviewMappingSchema = z.object({
  amount: z.string().min(1).optional(),
  credit: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  debit: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  externalReference: z.string().min(1).optional(),
});

const importPreviewDefaultsSchema = z
  .object({
    accountId: z.string().uuid(),
    categoryId: z.string().uuid().nullable().optional(),
    currency: z.nativeEnum(CurrencyEnum),
    fixedType: z.nativeEnum(TransactionType).nullable().optional(),
    typeStrategy: z.enum(['signed_amount', 'fixed_type']),
  })
  .superRefine((value, ctx) => {
    if (value.typeStrategy === 'fixed_type' && !value.fixedType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'fixedType is required when typeStrategy is fixed_type.',
        path: ['fixedType'],
      });
    }
  });

const importPreviewSchema = z.object({
  defaults: importPreviewDefaultsSchema,
  mapping: importPreviewMappingSchema.optional(),
  source: z.string().min(1),
});

const importCommitRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  fingerprint: z.string().min(1),
  categoryId: z.string().uuid().nullable().optional(),
  normalized: z.object({
    amount: z.number().nullable(),
    date: z.string().nullable(),
    description: z.string().nullable(),
    externalReference: z.string().nullable(),
    type: z.nativeEnum(TransactionType).nullable(),
  }),
});

const importCommitSchema = z.object({
  accountId: z.string().uuid(),
  idempotencyKey: z.string().min(1),
  approvedRows: z.array(importCommitRowSchema).min(1),
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

  createTransfer: publicProcedure
    .use(isAuthenticated)
    .input(createTransferSchema)
    .mutation(({ input, ctx }) => transactionController.createTransfer(input, ctx.userId)),

  importPreview: publicProcedure
    .use(isAuthenticated)
    .input(importPreviewSchema)
    .mutation(({ input, ctx }) => transactionController.importPreview(input, ctx.userId)),

  importCommit: publicProcedure
    .use(isAuthenticated)
    .input(importCommitSchema)
    .mutation(({ input, ctx }) => transactionController.importCommit(input, ctx.userId)),

  updateTransfer: publicProcedure
    .use(isAuthenticated)
    .input(updateTransferSchema)
    .mutation(({ input, ctx }) => transactionController.updateTransfer(input, ctx.userId)),
};
