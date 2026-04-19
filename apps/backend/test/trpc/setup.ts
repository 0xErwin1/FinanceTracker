import { t } from '@expenses/api';
import {
  CurrencyEnum,
  FinancialGoalsType,
  ObligationStatus,
  PlanStatus,
  TransactionType,
} from '@expenses/api';
import { AppDataSource } from '../../src/data-source';
import {
  Account,
  Budget,
  Category,
  FinancialGoal,
  Institution,
  InstallmentObligation,
  InstallmentPlan,
  RecurringTransaction,
  Transaction,
  User,
} from '../../src/entities';
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
    'accounts',
    'institutions',
    'installment_obligations',
    'installment_plans',
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

export async function seedInstitution(overrides: Record<string, unknown> = {}): Promise<Institution> {
  const defaults = {
    name: `Test Institution ${++_seedCounter}`,
    code: `TEST-${_seedCounter}`,
  };

  const repo = AppDataSource.getRepository(Institution);
  const institution = repo.create({ ...defaults, ...overrides } as Institution);
  return repo.save(institution);
}

export async function seedAccount(userId: string, overrides: Record<string, unknown> = {}): Promise<Account> {
  const defaults = {
    userId,
    name: `Test Account ${++_seedCounter}`,
    currency: CurrencyEnum.USD,
    kind: 'checking',
    ownership: 'self',
    institutionId: null,
    archivedAt: null,
  };

  const repo = AppDataSource.getRepository(Account);
  const account = repo.create({ ...defaults, ...overrides } as Account);
  return repo.save(account);
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
  if (!overrides.accountId) {
    const account = await seedAccount(userId, { currency: overrides.currency ?? CurrencyEnum.USD });
    overrides.accountId = account.id;
  }

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
  if (!overrides.accountId) {
    const account = await seedAccount(userId, { currency: overrides.currency ?? CurrencyEnum.USD });
    overrides.accountId = account.id;
  }

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

export async function seedInstallmentPlan(
  userId: string,
  overrides: Record<string, unknown> = {},
): Promise<InstallmentPlan> {
  if (!overrides.accountId) {
    const account = await seedAccount(userId, { currency: overrides.currency ?? CurrencyEnum.USD });
    overrides.accountId = account.id;
  }

  const defaults = {
    userId,
    totalAmount: 300,
    currency: CurrencyEnum.USD,
    installmentsCount: 3,
    categoryId: null,
    note: null,
    status: PlanStatus.ACTIVE,
  };

  const repo = AppDataSource.getRepository(InstallmentPlan);
  const plan = repo.create({ ...defaults, ...overrides } as any);
  return (await repo.save(plan)) as unknown as InstallmentPlan;
}

export async function seedInstallmentObligation(
  planId: string,
  overrides: Record<string, unknown> = {},
): Promise<InstallmentObligation> {
  const defaults = {
    planId,
    installmentNumber: 1,
    amount: 100,
    dueDate: '2026-01-01',
    status: ObligationStatus.PENDING,
    transactionId: null,
    paidAt: null,
  };

  const repo = AppDataSource.getRepository(InstallmentObligation);
  const obligation = repo.create({ ...defaults, ...overrides } as any);
  return (await repo.save(obligation)) as unknown as InstallmentObligation;
}
