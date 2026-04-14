import type { IncludeOptions, WhereOptions } from 'sequelize';
import { ApiError } from '../enums';
import { CustomError } from '../lib';
import { UserModel } from '../models';
import type { UserDTO } from '../types/DTOs';
import { hashPassword } from '../utils';

interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

async function getUser(
  where: WhereOptions<UserModel>,
  include: IncludeOptions[] = [],
): Promise<UserDTO | null> {
  const user = await UserModel.findOne({ where, include });
  return user ? (user.get({ plain: true }) as unknown as UserDTO) : null;
}

async function createUser(newUser: CreateUserInput): Promise<UserDTO> {
  if (await getUser({ email: newUser.email })) {
    throw new CustomError(ApiError.User.USER_ALREADY_EXISTS);
  }

  newUser.password = await hashPassword(newUser.password);

  // biome-ignore lint/suspicious/noExplicitAny: Sequelize create() type mismatch
  const user = await UserModel.create(newUser as any);

  return user.get({ plain: true }) as unknown as UserDTO;
}

export const userService = {
  getUser,
  createUser,
};
