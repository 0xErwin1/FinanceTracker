import { z } from 'zod';
import { TransactionType } from '../../enums';
import { publicProcedure } from '@expenses/api';
import { isAuthenticated } from '../protected';
import { categoryService } from '../../services';
import { mapServiceError } from '../errors';

const createCategorySchema = z.object({
  type: z.nativeEnum(TransactionType),
  name: z.string().min(1),
  note: z.string().optional().default(''),
});

const deleteCategorySchema = z.object({
  categoryId: z.string().uuid(),
  deleteTransactions: z.boolean().optional().default(false),
});

const getCategorySchema = z.object({
  categoryId: z.string().uuid(),
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
        await categoryService.deleteCategory(input.categoryId, ctx.userId, input.deleteTransactions);
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
        const category = await categoryService.getCategory(
          {
            categoryId: input.categoryId,
            userId: ctx.userId,
          },
          [],
        );

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
