import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../enums';
import { validationHelper } from '../helpers';
import { CustomResponse } from '../lib';
import { CustomError } from '../lib';
import { userService } from '../services';
import { RegisterUserRequest } from '../types/request/user';
import type { BodyRequest } from '../types/request/user/register_user';

async function createUser(
  req: Request<Record<string, never>, unknown, BodyRequest>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    validationHelper.checkValidation(req);

    const body = new RegisterUserRequest(req.body as BodyRequest);

    const user: RegisterUserRequest = new RegisterUserRequest(body);

    res.send(new CustomResponse(true, await userService.createUser(user)));
  } catch (err) {
    next(err);
  }
}

async function getUserById(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = res.locals.userId as string;

    if (!userId) {
      throw new CustomError(ApiError.Server.TOO_FEW_PARAMS);
    }

    const user = await userService.getUser({ userId }, []);

    res.send(new CustomResponse(true, user));
  } catch (err) {
    next(err);
  }
}

export const userController = {
  createUser,
  getUserById,
};
