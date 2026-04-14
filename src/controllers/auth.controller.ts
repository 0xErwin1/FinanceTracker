import type { NextFunction, Request, Response } from 'express';
import { validationHelper } from '../helpers';
import { CustomResponse } from '../lib';
import { authService } from '../services';

interface LoginRequest {
  email: string;
  password: string;
}

async function login(
  req: Request<Record<string, never>, unknown, LoginRequest>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    validationHelper.checkValidation(req);

    const { email, password }: LoginRequest = req.body;
    const { sessionID } = req;

    const response = await authService.login(email, password, sessionID);

    res.send(new CustomResponse(true, response));
  } catch (err) {
    next(err);
  }
}

async function logout(req: Request<Record<string, never>>, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sessionID } = req;

    await authService.logout(sessionID);

    res.send(new CustomResponse(true));
  } catch (err) {
    next(err);
  }
}

export const authController = {
  login,
  logout,
};
