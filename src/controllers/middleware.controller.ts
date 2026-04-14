import type { NextFunction, Request, Response } from 'express';
import { middlewareService } from '../services';

async function authorization(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await middlewareService.authorization(req, res, next);
  } catch (err) {
    next(err);
  }
}

function onlyLogin(req: Request, res: Response, next: NextFunction): void {
  try {
    middlewareService.onlyLogin(req, res, next);
  } catch (err) {
    next(err);
  }
}

export const middlewareController = {
  onlyLogin,
  authorization,
};
