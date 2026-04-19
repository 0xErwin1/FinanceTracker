import type { CurrencyEnum, FxRateDTO, UserValuationPreferencesDTO } from '@expenses/api';
import { AppDataSource } from '../data-source';
import { FxRate, User } from '../entities';
import { ApiError } from '../enums';
import { CustomError } from '../lib';
import { hashPassword } from '../utils';
import { categoryService } from './category.service';

const repo = () => AppDataSource.getRepository(User);
const fxRateRepo = () => AppDataSource.getRepository(FxRate);

interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface UpdateValuationPreferencesInput {
  reportingCurrency: CurrencyEnum | null;
  valuationFreshnessDays: number;
}

interface CreateFxRateInput {
  userId: string;
  baseCurrency: CurrencyEnum;
  quoteCurrency: CurrencyEnum;
  rate: number;
  effectiveDate: string;
  sourceLabel: string;
}

interface UpdateFxRateInput {
  id: string;
  userId: string;
  rate: number;
  effectiveDate: string;
  sourceLabel: string;
}

/**
 * Returns the full user record including the password hash.
 * Callers MUST strip the password before returning via API.
 */
async function getUser(where: Partial<Pick<User, 'email' | 'id'>>): Promise<User | null> {
  return repo().findOne({ where: where as any }) ?? null;
}

async function createUser(newUser: CreateUserInput): Promise<User> {
  if (await getUser({ email: newUser.email })) {
    throw new CustomError(ApiError.User.USER_ALREADY_EXISTS);
  }

  newUser.password = await hashPassword(newUser.password);

  const user = repo().create(newUser);
  await repo().save(user);

  await categoryService.seedDefaultCategories(user.id);

  return user;
}

async function updateProfile(userId: string, data: UpdateProfileInput): Promise<User> {
  const user = await getUser({ id: userId });

  if (!user) {
    throw new CustomError(ApiError.User.USER_DOES_NOT_EXIST);
  }

  if (data.email && data.email !== user.email) {
    const existing = await getUser({ email: data.email });
    if (existing) {
      throw new CustomError(ApiError.User.USER_ALREADY_EXISTS);
    }
  }

  Object.assign(user, data);
  await repo().save(user);

  return user;
}

async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await getUser({ id: userId });

  if (!user) {
    throw new CustomError(ApiError.User.USER_DOES_NOT_EXIST);
  }

  const { comparePassword } = await import('../utils');
  const isValid = await comparePassword(user.password, currentPassword);

  if (!isValid) {
    throw new CustomError(ApiError.User.WRONG_PASSWORD);
  }

  user.password = await hashPassword(newPassword);
  await repo().save(user);
}

async function getValuationPreferences(userId: string): Promise<UserValuationPreferencesDTO> {
  const user = await getUser({ id: userId });

  if (!user) {
    throw new CustomError(ApiError.User.USER_DOES_NOT_EXIST);
  }

  return {
    reportingCurrency: user.reportingCurrency,
    valuationFreshnessDays: user.valuationFreshnessDays,
  };
}

async function updateValuationPreferences(
  userId: string,
  data: UpdateValuationPreferencesInput,
): Promise<UserValuationPreferencesDTO> {
  const user = await getUser({ id: userId });

  if (!user) {
    throw new CustomError(ApiError.User.USER_DOES_NOT_EXIST);
  }

  user.reportingCurrency = data.reportingCurrency;
  user.valuationFreshnessDays = data.valuationFreshnessDays;

  await repo().save(user);

  return {
    reportingCurrency: user.reportingCurrency,
    valuationFreshnessDays: user.valuationFreshnessDays,
  };
}

async function listFxRates(userId: string): Promise<FxRateDTO[]> {
  return fxRateRepo().find({
    where: { userId },
    order: { effectiveDate: 'DESC', createdAt: 'DESC' },
  });
}

async function createFxRate(input: CreateFxRateInput): Promise<FxRateDTO> {
  const rate = fxRateRepo().create(input);
  return fxRateRepo().save(rate);
}

async function getFxRateOrFail(id: string, userId: string): Promise<FxRate> {
  const rate = await fxRateRepo().findOne({ where: { id, userId } });

  if (!rate) {
    throw new CustomError(ApiError.Server.NOT_FOUND);
  }

  return rate;
}

async function updateFxRate(input: UpdateFxRateInput): Promise<FxRateDTO> {
  const rate = await getFxRateOrFail(input.id, input.userId);

  rate.rate = input.rate;
  rate.effectiveDate = input.effectiveDate;
  rate.sourceLabel = input.sourceLabel;

  return fxRateRepo().save(rate);
}

async function deleteFxRate(id: string, userId: string): Promise<{ id: string }> {
  const rate = await getFxRateOrFail(id, userId);

  await fxRateRepo().remove(rate);

  return { id };
}

export const userService = {
  getUser,
  createUser,
  updateProfile,
  changePassword,
  getValuationPreferences,
  updateValuationPreferences,
  listFxRates,
  createFxRate,
  updateFxRate,
  deleteFxRate,
};
