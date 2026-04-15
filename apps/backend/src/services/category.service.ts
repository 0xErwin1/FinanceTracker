import { EntityManager } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Category, Transaction } from '../entities';
import { ApiError, type TransactionType } from '../enums';
import { CustomError, logger } from '../lib';
import type { CategoryDTO } from '../types/DTOs';

const repo = () => AppDataSource.getRepository(Category);

async function getAllCategories(userId: string): Promise<CategoryDTO[]> {
  return repo().find({ where: { userId } });
}

async function getCategory(
  where: Partial<Pick<Category, 'id' | 'userId' | 'type'>>,
  opt?: { entityManager?: EntityManager },
): Promise<CategoryDTO | null> {
  const manager = opt?.entityManager ?? repo();
  const category = await (manager instanceof EntityManager
    ? manager.findOne(Category, { where: where as any })
    : manager.findOne({ where: where as any }));

  return category ?? null;
}

interface CreateCategoryInput {
  type: TransactionType;
  name: string;
  note: string;
  userId: string;
  icon?: string;
  color?: string;
}

async function createCategory(
  input: CreateCategoryInput,
  opt?: { entityManager?: EntityManager },
): Promise<CategoryDTO> {
  if (opt?.entityManager) {
    const category = opt.entityManager.create(Category, input);
    await opt.entityManager.save(category);
    return category;
  }

  const category = repo().create(input);
  await repo().save(category);
  return category;
}

async function deleteCategory(
  categoryId: string,
  userId: string,
  deleteTransactions: boolean,
): Promise<void> {
  await AppDataSource.transaction(async (em) => {
    const category = await em.findOne(Category, {
      where: { id: categoryId, userId },
      relations: ['transactions'],
    });

    if (!category) {
      throw new CustomError(ApiError.Category.CATEGORY_NOT_EXIST);
    }

    logger.debug({ category, deleteTransactions });

    if (category.transactions.length !== 0 && !deleteTransactions) {
      throw new CustomError(ApiError.Category.CANNOT_DELETE_CATEGORY_TRANSACTIONS);
    }

    if (deleteTransactions) {
      await em.delete(Transaction, { categoryId, userId });
    } else {
      await em.update(Transaction, { categoryId, userId }, { categoryId: null });
    }

    await em.delete(Category, { id: categoryId, userId });
  });
}

export const categoryService = {
  getCategory,
  createCategory,
  deleteCategory,
  getAllCategories,
};
