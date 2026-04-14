import { plainToInstance } from 'class-transformer';
import type { IncludeOptions, WhereOptions } from 'sequelize';
import { ApiError } from '../enums';
import { CustomError } from '../lib';
import { UserModel } from '../models';
import { UserDTO } from '../types/DTOs';
import type { RegisterUserRequest } from '../types/request/user';
import { hashPassword } from '../utils';

async function getUser(where: WhereOptions<UserModel>, include: IncludeOptions[] = []): Promise<UserDTO> {
  return plainToInstance(UserDTO, await UserModel.findOne({ where, include }));
}

async function createUser(newUser: RegisterUserRequest): Promise<UserDTO> {
  if (await getUser({ email: newUser.email })) {
    throw new CustomError(ApiError.User.USER_ALREADY_EXISTS);
  }

  newUser.password = await hashPassword(newUser.password);

  // Sequelize .create() expects Optional<Model, Nullish> which includes model methods;
  // our DTO only has plain fields, so a type assertion is needed here.
  // biome-ignore lint/suspicious/noExplicitAny: Sequelize create() type mismatch
  const user = await UserModel.create(newUser as any);

  return plainToInstance(UserDTO, user);
}

export const userService = {
  getUser,
  createUser,
};
