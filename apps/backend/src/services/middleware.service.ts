import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../enums';
import { CustomError, logger } from '../lib';
import { redisClient } from '../redis';

function onlyLogin(_req: Request, res: Response, next: NextFunction): void {
  if (!res.locals.userId) {
    throw new CustomError(ApiError.Auth.NEED_BE_LOGGED_IN);
  }

  next();
}

async function authorization(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionId = req.sessionID;

  logger.debug({ sessionId });

  if (!sessionId) {
    return next();
  }

  const userId = await redisClient.get(`user:${sessionId}`);

  logger.debug({
    userId,
  });

  if (!userId) {
    return next();
  }

  res.locals.userId = userId;

  next();
}

export const middlewareService = {
  onlyLogin,
  authorization,
};
