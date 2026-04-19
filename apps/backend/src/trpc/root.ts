import { t } from '@expenses/api';
import { accountRouter } from './routers/account.router';
import { authRouter } from './routers/auth.router';
import { budgetRouter } from './routers/budget.router';
import { categoryRouter } from './routers/category.router';
import { financialGoalRouter } from './routers/financial_goal.router';
import { installmentRouter } from './routers/installment.router';
import { recurringRouter } from './routers/recurring.router';
import { transactionRouter } from './routers/transaction.router';
import { userRouter } from './routers/user.router';

export const appRouter = t.router({
  auth: authRouter,
  account: accountRouter,
  user: userRouter,
  category: categoryRouter,
  transaction: transactionRouter,
  financialGoal: financialGoalRouter,
  budget: budgetRouter,
  recurring: recurringRouter,
  installment: installmentRouter,
});

export type AppRouter = typeof appRouter;
