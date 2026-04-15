import { AppDataSource } from '../data-source';
import { User } from '../entities';
import { ApiError } from '../enums';
import { CustomError } from '../lib';
import type { UserDTO } from '../types/DTOs';
import { hashPassword } from '../utils';

const repo = () => AppDataSource.getRepository(User);

interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

async function getUser(where: Partial<Pick<User, 'email' | 'id'>>): Promise<UserDTO | null> {
  const user = await repo().findOne({ where: where as any });
  return user ?? null;
}

async function createUser(newUser: CreateUserInput): Promise<UserDTO> {
  if (await getUser({ email: newUser.email })) {
    throw new CustomError(ApiError.User.USER_ALREADY_EXISTS);
  }

  newUser.password = await hashPassword(newUser.password);

  const user = repo().create(newUser);
  await repo().save(user);

  return user;
}

export const userService = {
  getUser,
  createUser,
};
