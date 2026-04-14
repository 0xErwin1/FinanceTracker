import { type NextFunction, type Request, type Response, Router } from 'express';
import { CustomResponse } from '../lib';

const router: Router = Router();

router.get('/', (_req: Request, res: Response, _next: NextFunction) => {
  res.send(new CustomResponse(true, 'Up & running ;)!'));
});

export const healthRouter: Router = router;
