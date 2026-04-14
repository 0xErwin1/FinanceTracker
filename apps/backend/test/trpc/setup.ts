import { createCallerFactory } from '@trpc/server';
import { sequelize } from '../../src/models';
import { appRouter } from '../../src/trpc/root';

const createCaller = createCallerFactory(appRouter);

/**
 * Minimal mock req that satisfies the tRPC context shape.
 * Express-session adds `sessionID` at runtime; we provide it explicitly.
 */
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

/** Unauthenticated caller (no userId). */
export function createPublicCaller() {
  return createCaller({
    req: createMockReq(),
    res: createMockRes(),
    userId: null,
  });
}

/** Authenticated caller with an explicit userId. */
export function createAuthenticatedCaller(userId: string) {
  return createCaller({
    req: createMockReq(),
    res: createMockRes(),
    userId,
  });
}

/** Truncate all data tables (order matters for FK constraints). */
export async function truncateAllTables(): Promise<void> {
  await sequelize().query(`
    TRUNCATE public."transactions" CASCADE;
    TRUNCATE public."financial_goals" CASCADE;
    TRUNCATE public."categories" CASCADE;
    TRUNCATE public."users" CASCADE;
  `);
}

/**
 * Seed a user directly into the DB and return the plain object.
 * The password is hashed via bcrypt so that login comparisons work.
 */
export async function seedUser(overrides: Record<string, unknown> = {}) {
  const { hashPassword } = await import('../../src/utils/password.util');
  const { UserModel } = await import('../../src/models');

  const defaults = {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: await hashPassword('password123'),
  };

  // biome-ignore lint/suspicious/noExplicitAny: Sequelize create() type mismatch
  const user = await UserModel.create({ ...defaults, ...overrides } as any);
  return user.get({ plain: true });
}

/** Seed a category directly into the DB. */
export async function seedCategory(userId: string, overrides: Record<string, unknown> = {}) {
  const { CategoryModel } = await import('../../src/models');

  const defaults = {
    type: 'EXPENSE',
    name: 'Test Category',
    note: '',
    userId,
  };

  // biome-ignore lint/suspicious/noExplicitAny: Sequelize create() type mismatch
  const category = await CategoryModel.create({ ...defaults, ...overrides } as any);
  return category.get({ plain: true });
}

/** Seed a transaction directly into the DB. */
export async function seedTransaction(userId: string, overrides: Record<string, unknown> = {}) {
  const { TransactionModel } = await import('../../src/models');

  const defaults = {
    type: 'EXPENSE',
    amount: 100,
    currency: 'USD',
    note: '',
    day: 1,
    month: 'JANUARY',
    year: 2025,
    userId,
    exchangeRate: null,
  };

  // biome-ignore lint/suspicious/noExplicitAny: Sequelize create() type mismatch
  const transaction = await TransactionModel.create({ ...defaults, ...overrides } as any);
  return transaction.get({ plain: true });
}

/** Seed a financial goal directly into the DB. */
export async function seedFinancialGoal(userId: string, overrides: Record<string, unknown> = {}) {
  const { FinancialGoalModel } = await import('../../src/models');

  const defaults = {
    type: 'SPEND_LESS',
    targetAmount: 1000,
    currency: 'USD',
    name: 'Test Goal',
    note: '',
    month: 'JANUARY',
    year: 2025,
    userId,
  };

  // biome-ignore lint/suspicious/noExplicitAny: Sequelize create() type mismatch
  const goal = await FinancialGoalModel.create({ ...defaults, ...overrides } as any);
  return goal.get({ plain: true });
}
