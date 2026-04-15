import { t } from '@expenses/api';
import { CurrencyEnum, FinancialGoalsType, TransactionType } from '@expenses/api';
import { AppDataSource } from '../../src/data-source';
import { Budget, Category, FinancialGoal, RecurringTransaction, Transaction, User } from '../../src/entities';
import { appRouter } from '../../src/trpc/root';
import { hashPassword } from '../../src/utils/password.util';

const createCaller = t.createCallerFactory(appRouter);

function createMockReq(overrides: Record<string, unknown> = {}) {
  return {
    sessionID: 'test-session-id',
    session: {},
    ...overrides,
  };
}

function createMockRes() {
  return {};
}

export function createPublicCaller() {
  return createCaller({
    req: createMockReq(),
    res: createMockRes(),
    userId: null,
  });
}

export function createAuthenticatedCaller(userId: string) {
  return createCaller({
    req: createMockReq(),
    res: createMockRes(),
    userId,
  });
}

export async function truncateAllTables(): Promise<void> {
  const tables = [
    'transactions',
    'recurring_transactions',
    'financial_goals',
    'budgets',
    'categories',
    'sessions',
    'users',
  ];
  for (const table of tables) {
    await AppDataSource.query(`TRUNCATE public."${table}" CASCADE`);
  }
}

export async function seedUser(overrides: Record<string, unknown> = {}): Promise<User> {
  const defaults = {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: await hashPassword('password123'),
  };

  const repo = AppDataSource.getRepository(User);
  const user = repo.create({ ...defaults, ...overrides } as any);
  return (await repo.save(user)) as unknown as User;
}

let _seedCounter = 0;

export async function seedCategory(
  userId: string,
  overrides: Record<string, unknown> = {},
): Promise<Category> {
  const defaults = {
    type: TransactionType.EXPENSE,
    name: `Test Category ${++_seedCounter}`,
    note: '',
    userId,
  };

  const repo = AppDataSource.getRepository(Category);
  const category = repo.create({ ...defaults, ...overrides } as any);
  return (await repo.save(category)) as unknown as Category;
}

export async function seedTransaction(
  userId: string,
  overrides: Record<string, unknown> = {},
): Promise<Transaction> {
  if (!overrides.categoryId) {
    const cat = await seedCategory(userId);
    overrides.categoryId = cat.id;
  }

  const defaults = {
    type: TransactionType.EXPENSE,
    amount: 100,
    currency: CurrencyEnum.USD,
    note: '',
    date: '2025-01-01',
    userId,
    exchangeRate: null,
  };

  const repo = AppDataSource.getRepository(Transaction);
  const tx = repo.create({ ...defaults, ...overrides } as any);
  return (await repo.save(tx)) as unknown as Transaction;
}

export async function seedFinancialGoal(
  userId: string,
  overrides: Record<string, unknown> = {},
): Promise<FinancialGoal> {
  const defaults = {
    type: FinancialGoalsType.SPEND_LESS,
    targetAmount: 1000,
    currency: CurrencyEnum.USD,
    name: 'Test Goal',
    note: '',
    targetDate: '2026-01-01',
    userId,
  };

  const repo = AppDataSource.getRepository(FinancialGoal);
  const goal = repo.create({ ...defaults, ...overrides } as any);
  return (await repo.save(goal)) as unknown as FinancialGoal;
}

export async function seedBudget(userId: string, overrides: Record<string, unknown> = {}): Promise<Budget> {
  if (!overrides.categoryId) {
    const cat = await seedCategory(userId);
    overrides.categoryId = cat.id;
  }

  const defaults = {
    userId,
    month: '2025-01-01',
    amount: 500,
    alertThreshold: 80,
  };

  const repo = AppDataSource.getRepository(Budget);
  const budget = repo.create({ ...defaults, ...overrides } as any);
  return (await repo.save(budget)) as unknown as Budget;
}

export async function seedRecurring(
  userId: string,
  overrides: Record<string, unknown> = {},
): Promise<RecurringTransaction> {
  const defaults = {
    userId,
    type: TransactionType.EXPENSE,
    amount: 100,
    currency: CurrencyEnum.USD,
    dayOfMonth: 15,
    active: true,
    startDate: '2025-01-01',
    note: null,
    exchangeRate: null,
  };

  const repo = AppDataSource.getRepository(RecurringTransaction);
  const recurring = repo.create({ ...defaults, ...overrides } as any);
  return (await repo.save(recurring)) as unknown as RecurringTransaction;
}
