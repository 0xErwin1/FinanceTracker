import { buildTruncateTablesQuery, getMultiCurrencySchemaRepairs, resolveTablesToTruncate } from './setup';

describe('resolveTablesToTruncate', () => {
  it('keeps the configured truncation order for tables that exist', () => {
    expect(
      resolveTablesToTruncate(['transactions', 'fx_rates', 'users'], ['users', 'transactions', 'fx_rates']),
    ).toEqual(['transactions', 'fx_rates', 'users']);
  });

  it('skips tables that are missing from the current schema', () => {
    expect(resolveTablesToTruncate(['transactions', 'fx_rates', 'users'], ['transactions', 'users'])).toEqual(
      ['transactions', 'users'],
    );
  });

  it('builds one truncate statement for the resolved tables', () => {
    expect(buildTruncateTablesQuery(['transactions', 'fx_rates', 'users'])).toBe(
      'TRUNCATE public."transactions", public."fx_rates", public."users" CASCADE',
    );
  });

  it('returns null when there are no existing tables to truncate', () => {
    expect(buildTruncateTablesQuery([])).toBeNull();
  });
});

describe('getMultiCurrencySchemaRepairs', () => {
  it('adds the missing user valuation columns and fx_rates table', () => {
    expect(getMultiCurrencySchemaRepairs(['users'], ['id', 'email'])).toEqual([
      'ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "reporting_currency" public.currency_enum',
      'ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "valuation_freshness_days" integer',
      'UPDATE public."users" SET "valuation_freshness_days" = 3 WHERE "valuation_freshness_days" IS NULL',
      'ALTER TABLE public."users" ALTER COLUMN "valuation_freshness_days" SET DEFAULT 3',
      'ALTER TABLE public."users" ALTER COLUMN "valuation_freshness_days" SET NOT NULL',
      'CREATE TABLE IF NOT EXISTS public."fx_rates" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "base_currency" public.currency_enum NOT NULL, "quote_currency" public.currency_enum NOT NULL, "rate" numeric(18,8) NOT NULL, "effective_date" date NOT NULL, "source_label" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fx_rates" PRIMARY KEY ("id"), CONSTRAINT "FK_fx_rates_user" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION)',
      'CREATE INDEX IF NOT EXISTS "IDX_fx_rates_lookup" ON public."fx_rates" ("user_id", "base_currency", "quote_currency", "effective_date")',
    ]);
  });

  it('returns no repair queries when the multi-currency schema already exists', () => {
    expect(
      getMultiCurrencySchemaRepairs(
        ['users', 'fx_rates'],
        ['id', 'email', 'reporting_currency', 'valuation_freshness_days'],
      ),
    ).toEqual([]);
  });

  it('repairs only the missing valuation column when the rest of the schema is healthy', () => {
    expect(
      getMultiCurrencySchemaRepairs(['users', 'fx_rates'], ['id', 'email', 'reporting_currency']),
    ).toEqual([
      'ALTER TABLE public."users" ADD COLUMN IF NOT EXISTS "valuation_freshness_days" integer',
      'UPDATE public."users" SET "valuation_freshness_days" = 3 WHERE "valuation_freshness_days" IS NULL',
      'ALTER TABLE public."users" ALTER COLUMN "valuation_freshness_days" SET DEFAULT 3',
      'ALTER TABLE public."users" ALTER COLUMN "valuation_freshness_days" SET NOT NULL',
    ]);
  });

  it('recreates only the missing fx_rates table and lookup index when user columns already exist', () => {
    expect(
      getMultiCurrencySchemaRepairs(
        ['users'],
        ['id', 'email', 'reporting_currency', 'valuation_freshness_days'],
      ),
    ).toEqual([
      'CREATE TABLE IF NOT EXISTS public."fx_rates" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "base_currency" public.currency_enum NOT NULL, "quote_currency" public.currency_enum NOT NULL, "rate" numeric(18,8) NOT NULL, "effective_date" date NOT NULL, "source_label" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fx_rates" PRIMARY KEY ("id"), CONSTRAINT "FK_fx_rates_user" FOREIGN KEY ("user_id") REFERENCES public."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION)',
      'CREATE INDEX IF NOT EXISTS "IDX_fx_rates_lookup" ON public."fx_rates" ("user_id", "base_currency", "quote_currency", "effective_date")',
    ]);
  });
});
