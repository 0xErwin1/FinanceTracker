import type { Context } from '@expenses/api';
import type { Request, Response } from 'express';
import { logger } from '../lib';
import { redisClient } from '../redis';

export type { Context };

export async function createContext({ req, res }: { req: Request; res: Response }): Promise<Context> {
  let userId: string | null = null;

  const sessionId = req.sessionID;

  if (sessionId) {
    const stored = await redisClient.get(`user:${sessionId}`);

    if (stored) {
      userId = stored;
    }
  }

  logger.debug({ sessionId, userId }, 'tRPC context created');

  return {
    req,
    res,
    userId,
  };
}
