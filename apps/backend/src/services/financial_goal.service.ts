import { plainToInstance } from 'class-transformer';
import type { IncludeOptions, WhereOptions } from 'sequelize';
import { ApiError } from '../enums';
import { CustomError } from '../lib';
import { FinancialGoalModel } from '../models';
import { FinancialGoalDTO } from '../types/DTOs';
import type { CreateFinancialGoal, UpdateOptions } from '../types/request/financial_goal';

async function createFinancialGoal(newGoal: CreateFinancialGoal): Promise<FinancialGoalDTO> {
  // Sequelize .create() expects Optional<Model, Nullish> which includes model methods;
  // our DTO only has plain fields, so a type assertion is needed here.
  // biome-ignore lint/suspicious/noExplicitAny: Sequelize create() type mismatch
  const financialGoal = await FinancialGoalModel.create(newGoal as any);

  return plainToInstance(FinancialGoalDTO, financialGoal);
}

async function updateFinancialGoal(
  newGoal: UpdateOptions,
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

  return plainToInstance(FinancialGoalDTO, (updated as [number, FinancialGoalModel[]])[1][0]);
}

async function getFinancialGoal(
  where: WhereOptions<FinancialGoalModel>,
  include: IncludeOptions[],
): Promise<FinancialGoalDTO> {
  const financialGoal = await FinancialGoalModel.findOne({
    where,
    include,
  });

  return plainToInstance(FinancialGoalDTO, financialGoal);
}

async function getAllFinancialGoals(
  where: WhereOptions<FinancialGoalModel>,
  include: IncludeOptions[],
): Promise<FinancialGoalDTO[]> {
  const financialGoals = await FinancialGoalModel.findAll({
    where,
    include,
  });

  return plainToInstance(FinancialGoalDTO, financialGoals);
}

export const financialGoalService = {
  createFinancialGoal,
  updateFinancialGoal,
  getAllFinancialGoals,
  getFinancialGoal,
};
