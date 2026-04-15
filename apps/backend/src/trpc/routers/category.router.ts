import { publicProcedure } from '@expenses/api';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { TransactionType } from '../../enums';
import { categoryService } from '../../services';
import { mapServiceError } from '../errors';
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
    .mutation(async ({ input, ctx }) => {
      try {
        const category = await categoryService.createCategory({
          ...input,
          note: input.note ?? '',
          userId: ctx.userId,
        });
        return category;
      } catch (error) {
        mapServiceError(error);
      }
    }),

  delete: publicProcedure
    .use(isAuthenticated)
    .input(deleteCategorySchema)
    .mutation(async ({ input, ctx }) => {
      try {
        await categoryService.deleteCategory(input.id, ctx.userId, input.deleteTransactions);
        return { success: true };
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getById: publicProcedure
    .use(isAuthenticated)
    .input(getCategorySchema)
    .query(async ({ input, ctx }) => {
      try {
        const category = await categoryService.getCategory({
          id: input.id,
          userId: ctx.userId,
        });

        if (!category) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
        }

        return category;
      } catch (error) {
        mapServiceError(error);
      }
    }),

  getAll: publicProcedure.use(isAuthenticated).query(async ({ ctx }) => {
    try {
      const categories = await categoryService.getAllCategories(ctx.userId);
      return categories;
    } catch (error) {
      mapServiceError(error);
    }
  }),
};
