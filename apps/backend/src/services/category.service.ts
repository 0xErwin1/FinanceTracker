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
      await em.softDelete(Transaction, { categoryId, userId });
    } else {
      await em.update(Transaction, { categoryId, userId }, { categoryId: null });
    }

    await em.softDelete(Category, { id: categoryId, userId });
  });
}

interface DefaultCategorySeed {
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}

const DEFAULT_CATEGORIES: DefaultCategorySeed[] = [
  // Expense categories
  { name: 'Food', type: 'EXPENSE' as TransactionType, color: '#FF6B6B', icon: 'UtensilsCrossed' },
  { name: 'Rent', type: 'EXPENSE' as TransactionType, color: '#4ECDC4', icon: 'Home' },
  { name: 'Transport', type: 'EXPENSE' as TransactionType, color: '#45B7D1', icon: 'Car' },
  { name: 'Entertainment', type: 'EXPENSE' as TransactionType, color: '#96CEB4', icon: 'Gamepad2' },
  { name: 'Health', type: 'EXPENSE' as TransactionType, color: '#FFEAA7', icon: 'Heart' },
  { name: 'Shopping', type: 'EXPENSE' as TransactionType, color: '#DDA0DD', icon: 'ShoppingBag' },
  { name: 'Services', type: 'EXPENSE' as TransactionType, color: '#98D8C8', icon: 'Wrench' },
  { name: 'Education', type: 'EXPENSE' as TransactionType, color: '#F7DC6F', icon: 'GraduationCap' },
  // Income categories
  { name: 'Salary', type: 'INCOME' as TransactionType, color: '#2ECC71', icon: 'Banknote' },
  { name: 'Freelance', type: 'INCOME' as TransactionType, color: '#3498DB', icon: 'Laptop' },
  { name: 'Investments', type: 'INCOME' as TransactionType, color: '#9B59B6', icon: 'TrendingUp' },
  { name: 'Other Income', type: 'INCOME' as TransactionType, color: '#95A5A6', icon: 'Wallet' },
];

/**
 * Seeds default categories for a given user.
 * Skips categories that already exist (by name + type + userId uniqueness constraint).
 */
async function seedDefaultCategories(userId: string): Promise<void> {
  for (const seed of DEFAULT_CATEGORIES) {
    const existing = await repo().findOne({
      where: { userId, name: seed.name, type: seed.type },
      withDeleted: false,
    });

    if (!existing) {
      const category = repo().create({
        name: seed.name,
        type: seed.type,
        color: seed.color,
        icon: seed.icon,
        userId,
      });

      await repo().save(category);
    }
  }
}

interface UpdateCategoryInput {
  name?: string;
  type?: TransactionType;
  color?: string | null;
  icon?: string | null;
  note?: string | null;
}

async function updateCategory(
  categoryId: string,
  userId: string,
  data: UpdateCategoryInput,
): Promise<CategoryDTO> {
  const category = await repo().findOne({ where: { id: categoryId, userId } });

  if (!category) {
    throw new CustomError(ApiError.Category.CATEGORY_NOT_EXIST);
  }

  Object.assign(category, data);
  await repo().save(category);

  return category;
}

export const categoryService = {
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
  seedDefaultCategories,
};
