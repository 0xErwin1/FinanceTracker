import {
  CurrencyEnum,
  FinancialGoalsType,
  ObligationStatus,
  PlanStatus,
  TransactionType,
  t,
} from '@expenses/api';
import type { DeepPartial, EntityTarget } from 'typeorm';
import { AppDataSource } from '../../src/data-source';
import {
  Account,
  Budget,
  Category,
  FinancialGoal,
  InstallmentObligation,
  InstallmentPlan,
  Institution,
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

export function resolveTablesToTruncate(requestedTables: string[], existingTables: string[]): string[] {
  const existingTableSet = new Set(existingTables);

  return requestedTables.filter((table) => existingTableSet.has(table));
}

export function buildTruncateTablesQuery(tables: string[]): string | null {
  if (tables.length === 0) {
    return null;
  }

  return `TRUNCATE ${tables.map((table) => `public."${table}"`).join(', ')} CASCADE`;
}

export function getMultiCurrencySchemaRepairs(
  existingTables: string[],
  existingUserColumns: string[],
): string[] {
  const repairs: string[] = [];
  const userColumnSet = new Set(existingUserColumns);

  if (!userColumnSet.has('reporting_currency')) {
    repairs.push(
      'ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "reporting_currency" public.currency_enum',
    );
  }

  if (!userColumnSet.has('valuation_freshness_days')) {
    repairs.push(
      'ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "valuation_freshness_days" integer',
      'UPDATE public."users" SET "valuation_freshness_days" = 3 WHERE "valuation_freshness_days" IS NULL',
      'ALTER TABLE public."users" ALTER COLUMN "valuation_freshness_days" SET DEFAULT 3',
      'ALTER TABLE public."users" ALTER COLUMN "valuation_freshness_days" SET NOT NULL',
    );
  }

  if (!existingTables.includes('fx_rates')) {
    repairs.push(
      'CREATE TABLE IF NOT EXISTS public."fx_rates" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "base_currency" public.currency_enum NOT NULL, "quote_currency" public.currency_enum NOT NULL, "rate" numeric(18,8) NOT NULL, "effective_date" date NOT NULL, "source_label" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fx_rates" PRIMARY KEY ("id"), CONSTRAINT "FK_fx_rates_user" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION)',
      'CREATE INDEX IF NOT EXISTS "IDX_fx_rates_lookup" ON public."fx_rates" ("user_id", "base_currency", "quote_currency", "effective_date")',
    );
  }

  return repairs;
}

async function ensureMultiCurrencySchema(): Promise<void> {
  const tableRows = (await AppDataSource.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  )) as Array<{ tablename: string }>;
  const existingTables = tableRows.map((row) => row.tablename);

  if (!existingTables.includes('users')) {
    return;
  }

  const userColumnRows = (await AppDataSource.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users'`,
  )) as Array<{ column_name: string }>;
  const repairQueries = getMultiCurrencySchemaRepairs(
    existingTables,
    userColumnRows.map((row) => row.column_name),
  );

  for (const query of repairQueries) {
    await AppDataSource.query(query);
  }
}

export async function truncateAllTables(): Promise<void> {
  const tables = [
    'transactions',
    'fx_rates',
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
  await ensureMultiCurrencySchema();

  const tableRows = (await AppDataSource.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  )) as Array<{ tablename: string }>;
  const tablesToTruncate = resolveTablesToTruncate(
    tables,
    tableRows.map((row) => row.tablename),
  );

  const truncateQuery = buildTruncateTablesQuery(tablesToTruncate);

  if (truncateQuery) {
    await AppDataSource.query(truncateQuery);
  }
}

async function createAndSaveEntity<Entity extends object>(
  entityClass: EntityTarget<Entity>,
  input: DeepPartial<Entity>,
): Promise<Entity> {
  const repo = AppDataSource.getRepository(entityClass);

  return repo.save(repo.create(input)) as Promise<Entity>;
}

export async function seedInstitution(
  userId: string,
  overrides: Record<string, unknown> = {},
): Promise<Institution> {
  const defaults = {
    userId,
    name: `Test Institution ${++_seedCounter}`,
    code: `TEST-${_seedCounter}`,
  } satisfies DeepPartial<Institution>;

  return createAndSaveEntity(Institution, { ...defaults, ...overrides } as DeepPartial<Institution>);
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
  } satisfies DeepPartial<Account>;

  return createAndSaveEntity(Account, { ...defaults, ...overrides } as DeepPartial<Account>);
}

export async function seedUser(overrides: Record<string, unknown> = {}): Promise<User> {
  const defaults = {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: await hashPassword('password123'),
  } satisfies DeepPartial<User>;

  return createAndSaveEntity(User, { ...defaults, ...overrides } as DeepPartial<User>);
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
  } satisfies DeepPartial<Category>;

  return createAndSaveEntity(Category, { ...defaults, ...overrides } as DeepPartial<Category>);
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
  } satisfies DeepPartial<Transaction>;

  return createAndSaveEntity(Transaction, { ...defaults, ...overrides } as DeepPartial<Transaction>);
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
  } satisfies DeepPartial<FinancialGoal>;

  return createAndSaveEntity(FinancialGoal, { ...defaults, ...overrides } as DeepPartial<FinancialGoal>);
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
  } satisfies DeepPartial<Budget>;

  return createAndSaveEntity(Budget, { ...defaults, ...overrides } as DeepPartial<Budget>);
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
  } satisfies DeepPartial<RecurringTransaction>;

  return createAndSaveEntity(RecurringTransaction, {
    ...defaults,
    ...overrides,
  } as DeepPartial<RecurringTransaction>);
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
  } satisfies DeepPartial<InstallmentPlan>;

  return createAndSaveEntity(InstallmentPlan, { ...defaults, ...overrides } as DeepPartial<InstallmentPlan>);
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
  } satisfies DeepPartial<InstallmentObligation>;

  return createAndSaveEntity(InstallmentObligation, {
    ...defaults,
    ...overrides,
  } as DeepPartial<InstallmentObligation>);
}
