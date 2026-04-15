import { AppDataSource } from '../data-source';
import { FinancialGoal } from '../entities';
import { ApiError, type CurrencyEnum, type FinancialGoalsType } from '../enums';
import { CustomError } from '../lib';
import type { FinancialGoalDTO } from '../types/DTOs';

const repo = () => AppDataSource.getRepository(FinancialGoal);

interface CreateFinancialGoalInput {
  type: FinancialGoalsType;
  targetAmount: number;
  currency: CurrencyEnum;
  note: string;
  targetDate: string;
  name: string;
  userId: string;
}

interface UpdateGoalOptions {
  type?: FinancialGoalsType;
  targetAmount?: number;
  currency?: CurrencyEnum;
  note?: string;
  targetDate?: string;
  name?: string;
  currentAmount?: number;
}

async function createFinancialGoal(input: CreateFinancialGoalInput): Promise<FinancialGoalDTO> {
  const goal = repo().create(input);
  await repo().save(goal);
  return goal;
}

async function updateFinancialGoal(
  data: UpdateGoalOptions,
  where: Partial<Pick<FinancialGoal, 'id' | 'userId'>>,
): Promise<FinancialGoalDTO> {
  const goal = await repo().findOne({ where: where as any });

  if (!goal) {
    throw new CustomError(ApiError.FinancialGoal.FINANCIAL_GOAL_NOT_EXIST);
  }

  Object.assign(goal, data);
  await repo().save(goal);

  return goal;
}

async function getFinancialGoal(
  where: Partial<Pick<FinancialGoal, 'id' | 'userId'>>,
  relations: string[] = [],
): Promise<FinancialGoalDTO | null> {
  const goal = await repo().findOne({ where: where as any, relations });
  return goal ?? null;
}

async function getAllFinancialGoals(
  where: Partial<Pick<FinancialGoal, 'userId'>>,
  relations: string[] = [],
): Promise<FinancialGoalDTO[]> {
  return repo().find({ where: where as any, relations });
}

export const financialGoalService = {
  createFinancialGoal,
  updateFinancialGoal,
  getAllFinancialGoals,
  getFinancialGoal,
};
