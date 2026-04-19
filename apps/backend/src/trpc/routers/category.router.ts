import { publicProcedure } from '@expenses/api';
import { z } from 'zod';
import { categoryController } from '../../controllers';
import { TransactionType } from '../../enums';
import { isAuthenticated } from '../protected';

const createCategorySchema = z.object({
  type: z.nativeEnum(TransactionType),
  name: z.string().min(1),
  note: z.string().optional().default(''),
  icon: z.string().max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  type: z.nativeEnum(TransactionType).optional(),
  note: z.string().nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
});

const deleteCategorySchema = z.object({
  id: z.string().uuid(),
  deleteTransactions: z.boolean().optional().default(false),
});

const getCategorySchema = z.object({
  id: z.string().uuid(),
});

export const categoryRouter = {
  create: publicProcedure
    .use(isAuthenticated)
    .input(createCategorySchema)
    .mutation(({ input, ctx }) => categoryController.create(input, ctx.userId)),

  update: publicProcedure
    .use(isAuthenticated)
    .input(updateCategorySchema)
    .mutation(({ input, ctx }) => categoryController.update(input, ctx.userId)),

  delete: publicProcedure
    .use(isAuthenticated)
    .input(deleteCategorySchema)
    .mutation(({ input, ctx }) => categoryController.delete(input, ctx.userId)),

  getById: publicProcedure
    .use(isAuthenticated)
    .input(getCategorySchema)
    .query(({ input, ctx }) => categoryController.getById(input, ctx.userId)),

  getAll: publicProcedure.use(isAuthenticated).query(({ ctx }) => categoryController.getAll(ctx.userId)),
};
