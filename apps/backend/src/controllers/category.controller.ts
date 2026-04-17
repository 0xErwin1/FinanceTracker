import { TRPCError } from '@trpc/server';
import { categoryService } from '../services';
import { mapServiceError } from '../trpc/errors';

export const categoryController = {
  async create(
    input: {
      type: any;
      name: string;
      note?: string;
      icon?: string;
      color?: string;
    },
    userId: string,
  ) {
    try {
      return await categoryService.createCategory({
        ...input,
        note: input.note ?? '',
        userId,
      });
    } catch (error) {
      mapServiceError(error);
    }
  },

  async update(
    input: {
      id: string;
      name?: string;
      type?: any;
      color?: string | null;
      icon?: string | null;
      note?: string | null;
    },
    userId: string,
  ) {
    try {
      const { id, ...data } = input;
      return await categoryService.updateCategory(id, userId, data);
    } catch (error) {
      mapServiceError(error);
    }
  },

  async delete(input: { id: string; deleteTransactions: boolean }, userId: string) {
    try {
      await categoryService.deleteCategory(input.id, userId, input.deleteTransactions);
      return { success: true };
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getById(input: { id: string }, userId: string) {
    try {
      const category = await categoryService.getCategory({
        id: input.id,
        userId,
      });

      if (!category) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
      }

      return category;
    } catch (error) {
      mapServiceError(error);
    }
  },

  async getAll(userId: string) {
    try {
      return await categoryService.getAllCategories(userId);
    } catch (error) {
      mapServiceError(error);
    }
  },
};
