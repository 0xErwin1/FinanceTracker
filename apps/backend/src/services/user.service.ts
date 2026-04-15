import { AppDataSource } from '../data-source';
import { User } from '../entities';
import { ApiError } from '../enums';
import { CustomError } from '../lib';
import { hashPassword } from '../utils';

const repo = () => AppDataSource.getRepository(User);

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

export const userService = {
  getUser,
  createUser,
  updateProfile,
  changePassword,
};
