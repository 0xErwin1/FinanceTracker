import { plainToInstance } from 'class-transformer';
import { ApiError } from 'enums/api_error.enum';
import type { IncludeOptions, Transaction, WhereOptions } from 'sequelize';
import { CustomError, logger } from '../lib';
import { CategoryModel, TransactionModel, sequelize } from '../models';
import { CategoryDTO } from '../types/DTOs';
import type { CreateCategoryRequest } from '../types/request/category';

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

  return plainToInstance(CategoryDTO, categories);
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
): Promise<CategoryDTO> {
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

    return plainToInstance(CategoryDTO, category);
  } catch (err) {
    if (opt?.commit) {
      opt.transaction.rollback();
    }

    throw err;
  }
}

async function createCategory(
  newCategory: CreateCategoryRequest,
  opt: Opt = { transaction: undefined, commit: true },
): Promise<CategoryDTO> {
  if (!opt.transaction) {
    opt.transaction = await sequelize().transaction();
  }

  try {
    // Sequelize .create() expects Optional<Model, Nullish> which includes model methods;
    // our DTO only has plain fields, so a type assertion is needed here.
    // biome-ignore lint/suspicious/noExplicitAny: Sequelize create() type mismatch
    const category = await CategoryModel.create(newCategory as any, {
      transaction: opt.transaction,
    });

    if (opt?.commit) {
      opt.transaction.commit();
    }

    return plainToInstance(CategoryDTO, category);
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
