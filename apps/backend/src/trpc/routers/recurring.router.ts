import { publicProcedure } from '@expenses/api';
import { z } from 'zod';
import { CurrencyEnum, TransactionType } from '../../enums';
import { recurringController } from '../../controllers';
import { isAuthenticated } from '../protected';

const createRecurringSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().min(0),
  currency: z.nativeEnum(CurrencyEnum),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  note: z.string().optional(),
  dayOfMonth: z.number().int().min(1).max(31),
  startDate: z.string(),
  endDate: z.string().optional(),
  exchangeRate: z.number().optional(),
  goalId: z.string().uuid().optional(),
});

const updateRecurringSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(TransactionType).optional(),
  amount: z.number().min(0).optional(),
  currency: z.nativeEnum(CurrencyEnum).optional(),
  accountId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  note: z.string().nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  exchangeRate: z.number().nullable().optional(),
  goalId: z.string().uuid().nullable().optional(),
});

const recurringIdSchema = z.object({
  id: z.string().uuid(),
});

const getRecurringSchema = z.object({
  active: z.boolean().optional(),
});

export const recurringRouter = {
  create: publicProcedure
    .use(isAuthenticated)
    .input(createRecurringSchema)
    .mutation(({ input, ctx }) => recurringController.create(input, ctx.userId)),

  update: publicProcedure
    .use(isAuthenticated)
    .input(updateRecurringSchema)
    .mutation(({ input, ctx }) => recurringController.update(input, ctx.userId)),

  delete: publicProcedure
    .use(isAuthenticated)
    .input(recurringIdSchema)
    .mutation(({ input, ctx }) => recurringController.delete(input, ctx.userId)),

  getById: publicProcedure
    .use(isAuthenticated)
    .input(recurringIdSchema)
    .query(({ input, ctx }) => recurringController.getById(input, ctx.userId)),

  getAll: publicProcedure
    .use(isAuthenticated)
    .input(getRecurringSchema)
    .query(({ input, ctx }) => recurringController.getAll(input, ctx.userId)),

  pause: publicProcedure
    .use(isAuthenticated)
    .input(recurringIdSchema)
    .mutation(({ input, ctx }) => recurringController.pause(input, ctx.userId)),

  resume: publicProcedure
    .use(isAuthenticated)
    .input(recurringIdSchema)
    .mutation(({ input, ctx }) => recurringController.resume(input, ctx.userId)),
};
