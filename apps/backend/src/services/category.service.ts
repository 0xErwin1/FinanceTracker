import { ApiError } from 'enums/api_error.enum';
import type { IncludeOptions, Transaction, WhereOptions } from 'sequelize';
import { CustomError, logger } from '../lib';
import { CategoryModel, TransactionModel, sequelize } from '../models';
import type { CategoryDTO } from '../types/DTOs';

interface Opt {
  transaction?: Transaction;
  commit?: boolean;
}

async function getAllCategories(userId: string): Promise<CategoryDTO[]> {
  const categories = await CategoryModel.findAll({
    where: {
      userId,
    },
  });

  return categories.map((c) => c.get({ plain: true }) as unknown as CategoryDTO);
}

async function deleteCategory(
  categoryId: string,
  userId: string,
  deleteTransactions: boolean,
): Promise<void> {
  const t = await sequelize().transaction();
  try {
    const category = await CategoryModel.findOne({
      where: {
        userId,
        categoryId,
      },
      include: [
        {
          model: TransactionModel,
        },
      ],
      transaction: t,
    });

    if (!category) {
      throw new CustomError(ApiError.Category.CATEGORY_NOT_EXIST);
    }

    logger.debug({
      category,
      deleteTransactions,
    });

    if (category.trasactions.length !== 0 && !deleteTransactions) {
      throw new CustomError(ApiError.Category.CANNOT_DELETE_CATEGORY_TRASACTIONS);
    }

    if (deleteTransactions) {
      await TransactionModel.destroy({
        where: {
          categoryId,
          userId,
        },
        transaction: t,
      });
    } else {
      await TransactionModel.update(
        {
          categoryId: null as unknown as string,
        },
        {
          where: {
            categoryId,
            userId,
          },
          transaction: t,
        },
      );
    }

    await CategoryModel.destroy({
      where: {
        categoryId,
        userId,
      },
      transaction: t,
    });

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function getCategory(
  where: WhereOptions<CategoryModel>,
  include: IncludeOptions[] = [],
  opt: Opt = {
    transaction: undefined,
    commit: true,
  },
): Promise<CategoryDTO | null> {
  if (!opt?.transaction) {
    opt.transaction = await sequelize().transaction();
  }

  try {
    const category = await CategoryModel.findOne({
      where,
      include,
      transaction: opt.transaction,
    });

    if (opt?.commit) {
      opt.transaction.commit();
    }

    return category ? (category.get({ plain: true }) as unknown as CategoryDTO) : null;
  } catch (err) {
    if (opt?.commit) {
      opt.transaction.rollback();
    }

    throw err;
  }
}

interface CreateCategoryInput {
  type: string;
  name: string;
  note: string;
  userId: string;
}

async function createCategory(
  newCategory: CreateCategoryInput,
  opt: Opt = { transaction: undefined, commit: true },
): Promise<CategoryDTO> {
  if (!opt.transaction) {
    opt.transaction = await sequelize().transaction();
  }

  try {
    // biome-ignore lint/suspicious/noExplicitAny: Sequelize create() type mismatch
    const category = await CategoryModel.create(newCategory as any, {
      transaction: opt.transaction,
    });

    if (opt?.commit) {
      opt.transaction.commit();
    }

    return category.get({ plain: true }) as unknown as CategoryDTO;
  } catch (err) {
    if (opt?.commit) {
      opt.transaction.rollback();
    }

    throw err;
  }
}

export const categoryService = {
  getCategory,
  createCategory,
  deleteCategory,
  getAllCategories,
};
