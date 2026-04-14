import type { IncludeOptions, WhereOptions } from 'sequelize';
import { ApiError } from '../enums';
import { CustomError } from '../lib';
import { FinancialGoalModel } from '../models';
import type { FinancialGoalDTO } from '../types/DTOs';

interface CreateFinancialGoalInput {
  type: string;
  targetAmount: number;
  currency: string;
  note: string;
  month: string;
  year: number;
  name: string;
  userId: string;
}

interface UpdateGoalOptions {
  type?: string;
  targetAmount?: number;
  currency?: string;
  note?: string;
  month?: string;
  year?: number;
  name?: string;
  currentAmount?: number;
}

async function createFinancialGoal(newGoal: CreateFinancialGoalInput): Promise<FinancialGoalDTO> {
  // biome-ignore lint/suspicious/noExplicitAny: Sequelize create() type mismatch
  const financialGoal = await FinancialGoalModel.create(newGoal as any);

  return financialGoal.get({ plain: true }) as unknown as FinancialGoalDTO;
}

async function updateFinancialGoal(
  newGoal: UpdateGoalOptions,
  where: WhereOptions<FinancialGoalModel>,
): Promise<FinancialGoalDTO> {
  const financialGoal = await FinancialGoalModel.findOne({
    where,
  });

  if (!financialGoal) {
    throw new CustomError(ApiError.FinancialGoal.FINANCIAL_GOAL_NOT_EXIST);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Sequelize update() type mismatch
  const updated = await FinancialGoalModel.update(newGoal as any, {
    where,
    returning: true,
  });

  return (updated as [number, FinancialGoalModel[]])[1][0].get({
    plain: true,
  }) as unknown as FinancialGoalDTO;
}

async function getFinancialGoal(
  where: WhereOptions<FinancialGoalModel>,
  include: IncludeOptions[],
): Promise<FinancialGoalDTO | null> {
  const financialGoal = await FinancialGoalModel.findOne({
    where,
    include,
  });

  return financialGoal ? (financialGoal.get({ plain: true }) as unknown as FinancialGoalDTO) : null;
}

async function getAllFinancialGoals(
  where: WhereOptions<FinancialGoalModel>,
  include: IncludeOptions[],
): Promise<FinancialGoalDTO[]> {
  const financialGoals = await FinancialGoalModel.findAll({
    where,
    include,
  });

  return financialGoals.map((g) => g.get({ plain: true }) as unknown as FinancialGoalDTO);
}

export const financialGoalService = {
  createFinancialGoal,
  updateFinancialGoal,
  getAllFinancialGoals,
  getFinancialGoal,
};
