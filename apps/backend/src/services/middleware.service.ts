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
  const hasSession = Boolean(sessionId);

  if (!sessionId) {
    logger.debug({ hasSession, hasUser: false }, 'auth_middleware_authorization_resolved');
    return next();
  }

  const userId = await redisClient.get(`user:${sessionId}`);
  const hasUser = Boolean(userId);

  logger.debug({ hasSession, hasUser }, 'auth_middleware_authorization_resolved');

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
