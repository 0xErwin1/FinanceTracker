import { t } from '@expenses/api';
import { authRouter } from './routers/auth.router';
import { categoryRouter } from './routers/category.router';
import { financialGoalRouter } from './routers/financial_goal.router';
import { transactionRouter } from './routers/transaction.router';
import { userRouter } from './routers/user.router';

export const appRouter = t.router({
  auth: authRouter,
  user: userRouter,
  category: categoryRouter,
  transaction: transactionRouter,
  financialGoal: financialGoalRouter,
});

export type AppRouter = typeof appRouter;
