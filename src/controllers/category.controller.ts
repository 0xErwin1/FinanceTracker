import { ApiError } from 'enums/api_error.enum';
import type { NextFunction, Request, Response } from 'express';
import type { TransactionType } from '../enums';
import { validationHelper } from '../helpers';
import { CustomError, CustomResponse } from '../lib';
import { categoryService } from '../services';

interface CreateCategoryBody {
  type: TransactionType;
  name: string;
  note?: string;
}

async function createCategory(
  req: Request<Record<string, never>, unknown, CreateCategoryBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    validationHelper.checkValidation(req);

    const userId = res.locals.userId as string;
    const body = req.body;

    const category = await categoryService.createCategory(
      {
        ...body,
        note: body.note ?? '',
        userId,
      },
      {
        transaction: undefined,
        commit: true,
      },
    );

    res.send(new CustomResponse(true, category));
  } catch (err) {
    next(err);
  }
}

interface DeleteCategoryQuery {
  [key: string]: string | undefined;
  deleteTransactions?: string;
}

async function deleteCategory(
  req: Request<{ categoryId: string }, unknown, Record<string, never>, DeleteCategoryQuery>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    validationHelper.checkValidation(req);

    const { categoryId } = req.params;
    const { deleteTransactions } = req.query;
    const userId = res.locals.userId as string;

    await categoryService.deleteCategory(categoryId, userId, Boolean(deleteTransactions));

    res.send(new CustomResponse(true));
  } catch (err) {
    next(err);
  }
}

async function getCategoryById(
  req: Request<{ categoryId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    validationHelper.checkValidation(req);

    const { categoryId } = req.params;
    const userId = res.locals.userId as string;

    const category = await categoryService.getCategory(
      {
        categoryId,
        userId,
      },
      [],
      {
        transaction: undefined,
        commit: true,
      },
    );

    if (!category) {
      throw new CustomError(ApiError.Category.CATEGORY_NOT_EXIST);
    }

    res.send(new CustomResponse(true, category));
  } catch (err) {
    next(err);
  }
}

async function getAllCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = res.locals.userId as string;
    const category = await categoryService.getAllCategories(userId);

    res.send(new CustomResponse(true, category));
  } catch (err) {
    next(err);
  }
}

export const categoryController = {
  createCategory,
  deleteCategory,
  getCategoryById,
  getAllCategories,
};
