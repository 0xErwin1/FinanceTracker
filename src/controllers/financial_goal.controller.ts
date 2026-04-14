import type { NextFunction, Request, Response } from 'express';
import { ApiError, type CurrencyEnum, type FinancialGoalsType, type MonthEnum } from '../enums';
import { validationHelper } from '../helpers';
import { CustomError, CustomResponse } from '../lib';
import { TransactionModel } from '../models';
import { financialGoalService } from '../services';
import { CreateFinancialGoal } from '../types/request/financial_goal';

interface CreateFinancialGoalBody {
  type: FinancialGoalsType;
  targetAmount: number;
  currency: CurrencyEnum;
  note: string;
  month: MonthEnum;
  year: number;
  name: string;
}

async function createFinancialGoal(
  req: Request<Record<string, never>, unknown, CreateFinancialGoalBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    validationHelper.checkValidation(req);

    const userId = res.locals.userId as string;

    const body: CreateFinancialGoal = new CreateFinancialGoal({
      ...req.body,
      userId,
    });

    const financialGoal = await financialGoalService.createFinancialGoal(body);

    res.send(new CustomResponse(true, financialGoal));
  } catch (err) {
    next(err);
  }
}

async function getFinancialGoalById(
  req: Request<{ goalId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    validationHelper.checkValidation(req);

    const userId = res.locals.userId as string;
    const { goalId } = req.params;

    const financialGoal = await financialGoalService.getFinancialGoal(
      {
        userId,
        goalId,
      },
      [
        {
          model: TransactionModel,
        },
      ],
    );

    if (!financialGoal) {
      throw new CustomError(ApiError.FinancialGoal.FINANCIAL_GOAL_NOT_EXIST);
    }

    res.send(new CustomResponse(true, financialGoal));
  } catch (err) {
    next(err);
  }
}

async function getAllFinancialGoals(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = res.locals.userId as string;

    const financialGoals = await financialGoalService.getAllFinancialGoals(
      {
        userId,
      },
      [
        {
          model: TransactionModel,
        },
      ],
    );

    res.send(new CustomResponse(true, financialGoals));
  } catch (err) {
    next(err);
  }
}

export const financialGoalController = {
  createFinancialGoal,
  getFinancialGoalById,
  getAllFinancialGoals,
};
