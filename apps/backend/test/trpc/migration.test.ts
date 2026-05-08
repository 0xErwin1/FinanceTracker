import { DataSource, type MigrationInterface } from 'typeorm';
import { config } from '../../src/config';
import { InitialSchema1744500000000 } from '../../src/migrations/1744500000000-InitialSchema';
import { RecurringTransactions1744600000000 } from '../../src/migrations/1744600000000-RecurringTransactions';
import { InstallmentsRedesign1744700000000 } from '../../src/migrations/1744700000000-InstallmentsRedesign';
import { AccountsBankingFoundation1744800000000 } from '../../src/migrations/1744800000000-AccountsBankingFoundation';
import { InstitutionOwnership1761000000000 } from '../../src/migrations/1761000000000-InstitutionOwnership';

jest.setTimeout(30000);

const legacyMigrations: MigrationInterface[] = [
  new InitialSchema1744500000000(),
  new RecurringTransactions1744600000000(),
  new InstallmentsRedesign1744700000000(),
];

const latestMigrations: MigrationInterface[] = [
  ...legacyMigrations,
  new AccountsBankingFoundation1744800000000(),
];

describe('accounts banking foundation migration', () => {
  let dataSource: DataSource;

  async function resetSchema(migrations: MigrationInterface[]): Promise<void> {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }

    dataSource = new DataSource({
      type: 'postgres',
      url: config.databaseUrl,
      synchronize: false,
      logging: false,
      migrations: [],
    });

    await dataSource.initialize();
    await dataSource.query('DROP SCHEMA IF EXISTS public CASCADE');
    await dataSource.query('CREATE SCHEMA IF NOT EXISTS public');

    const queryRunner = dataSource.createQueryRunner();

    try {
      for (const migration of migrations) {
        await migration.up(queryRunner);
      }
    } finally {
      await queryRunner.release();
    }
  }

  beforeEach(async () => {
    await resetSchema(legacyMigrations);
  });

  afterAll(async () => {
    await resetSchema(latestMigrations);
    await dataSource.destroy();
  });

  it('backfills one imported account per user and currency without rewriting legacy transaction dates or amounts', async () => {
    const [{ id: userId }] = await dataSource.query(
      `
        INSERT INTO "users" ("email", "first_name", "last_name", "password")
        VALUES ('migration@example.com', 'Migration', 'User', 'hashed-password')
        RETURNING "id"
      `,
    );

    const [{ id: txOneId, amount: txOneAmount, date: txOneDate }] = await dataSource.query(
      `
        INSERT INTO "transactions" ("type", "amount", "currency", "date", "user_id")
        VALUES ('EXPENSE', 42.50, 'USD', '2025-01-05', $1)
        RETURNING "id", "amount", "date"
      `,
      [userId],
    );

    const [{ id: txTwoId, amount: txTwoAmount, date: txTwoDate }] = await dataSource.query(
      `
        INSERT INTO "transactions" ("type", "amount", "currency", "date", "user_id")
        VALUES ('INCOME', 120.00, 'USD', '2025-01-08', $1)
        RETURNING "id", "amount", "date"
      `,
      [userId],
    );

    const [{ id: recurringId }] = await dataSource.query(
      `
        INSERT INTO "recurring_transactions" (
          "user_id", "type", "amount", "currency", "day_of_month", "start_date"
        )
        VALUES ($1, 'EXPENSE', 15.00, 'USD', 10, '2025-01-10')
        RETURNING "id"
      `,
      [userId],
    );

    const [{ id: planId }] = await dataSource.query(
      `
        INSERT INTO "installment_plans" (
          "user_id", "total_amount", "currency", "installments_count", "status"
        )
        VALUES ($1, 300.00, 'USD', 3, 'ACTIVE')
        RETURNING "id"
      `,
      [userId],
    );

    await dataSource.query(
      `
        INSERT INTO "transactions" ("type", "amount", "currency", "date", "user_id")
        VALUES ('EXPENSE', 50.00, 'EUR', '2025-02-03', $1)
      `,
      [userId],
    );

    const queryRunner = dataSource.createQueryRunner();

    try {
      await new AccountsBankingFoundation1744800000000().up(queryRunner);
    } finally {
      await queryRunner.release();
    }

    const accounts = await dataSource.query(
      `
        SELECT "id", "name", "currency", "import_source"
        FROM "accounts"
        WHERE "user_id" = $1
        ORDER BY "currency" ASC
      `,
      [userId],
    );

    expect(accounts).toHaveLength(2);
    expect(accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Imported EUR', currency: 'EUR', import_source: 'legacy-backfill' }),
        expect.objectContaining({ name: 'Imported USD', currency: 'USD', import_source: 'legacy-backfill' }),
      ]),
    );

    const usdAccounts = accounts.filter((account: { currency: string }) => account.currency === 'USD');
    expect(usdAccounts).toHaveLength(1);

    const usdAccountId = usdAccounts[0].id as string;

    const [mappedTransactionOne] = await dataSource.query(
      `SELECT "account_id", "amount", "date" FROM "transactions" WHERE "id" = $1`,
      [txOneId],
    );
    const [mappedTransactionTwo] = await dataSource.query(
      `SELECT "account_id", "amount", "date" FROM "transactions" WHERE "id" = $1`,
      [txTwoId],
    );
    const [mappedRecurring] = await dataSource.query(
      `SELECT "account_id" FROM "recurring_transactions" WHERE "id" = $1`,
      [recurringId],
    );
    const [mappedPlan] = await dataSource.query(
      `SELECT "account_id" FROM "installment_plans" WHERE "id" = $1`,
      [planId],
    );

    expect(mappedTransactionOne.account_id).toBe(usdAccountId);
    expect(mappedTransactionTwo.account_id).toBe(usdAccountId);
    expect(mappedRecurring.account_id).toBe(usdAccountId);
    expect(mappedPlan.account_id).toBe(usdAccountId);

    expect(String(mappedTransactionOne.amount)).toBe(String(txOneAmount));
    expect(String(mappedTransactionOne.date)).toBe(String(txOneDate));
    expect(String(mappedTransactionTwo.amount)).toBe(String(txTwoAmount));
    expect(String(mappedTransactionTwo.date)).toBe(String(txTwoDate));
  }, 20000);
});

describe('institution ownership migration', () => {
  let dataSource: DataSource;

  async function resetSchema(migrations: MigrationInterface[]): Promise<void> {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }

    dataSource = new DataSource({
      type: 'postgres',
      url: config.databaseUrl,
      synchronize: false,
      logging: false,
      migrations: [],
    });

    await dataSource.initialize();
    await dataSource.query('DROP SCHEMA IF EXISTS public CASCADE');
    await dataSource.query('CREATE SCHEMA IF NOT EXISTS public');

    const queryRunner = dataSource.createQueryRunner();

    try {
      for (const migration of migrations) {
        await migration.up(queryRunner);
      }
    } finally {
      await queryRunner.release();
    }
  }

  beforeEach(async () => {
    await resetSchema(latestMigrations);
  });

  afterAll(async () => {
    await resetSchema([...latestMigrations, new InstitutionOwnership1761000000000()]);
    await dataSource.destroy();
  });

  it('preserves account links for a legacy institution used by one user', async () => {
    const [{ id: userId }] = await dataSource.query(
      `
        INSERT INTO "users" ("email", "first_name", "last_name", "password")
        VALUES ('solo-owner@example.com', 'Solo', 'Owner', 'hashed-password')
        RETURNING "id"
      `,
    );
    const [{ id: institutionId }] = await dataSource.query(
      `
        INSERT INTO "institutions" ("name", "code")
        VALUES ('Solo Bank', 'SOLO')
        RETURNING "id"
      `,
    );
    const [{ id: accountId }] = await dataSource.query(
      `
        INSERT INTO "accounts" ("user_id", "name", "currency", "institution_id")
        VALUES ($1, 'Primary checking', 'USD', $2)
        RETURNING "id"
      `,
      [userId, institutionId],
    );

    const queryRunner = dataSource.createQueryRunner();

    try {
      await new InstitutionOwnership1761000000000().up(queryRunner);
    } finally {
      await queryRunner.release();
    }

    await expect(
      dataSource.query(
        `
          SELECT i."user_id", a."institution_id"
          FROM "institutions" i
          JOIN "accounts" a ON a."institution_id" = i."id"
          WHERE a."id" = $1
        `,
        [accountId],
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        user_id: userId,
        institution_id: institutionId,
      }),
    ]);
  });

  it('splits a shared legacy institution into one owned row per user', async () => {
    const [{ id: firstUserId }] = await dataSource.query(
      `
        INSERT INTO "users" ("email", "first_name", "last_name", "password")
        VALUES ('first-owner@example.com', 'First', 'Owner', 'hashed-password')
        RETURNING "id"
      `,
    );
    const [{ id: secondUserId }] = await dataSource.query(
      `
        INSERT INTO "users" ("email", "first_name", "last_name", "password")
        VALUES ('second-owner@example.com', 'Second', 'Owner', 'hashed-password')
        RETURNING "id"
      `,
    );
    const [{ id: institutionId }] = await dataSource.query(
      `
        INSERT INTO "institutions" ("name", "code")
        VALUES ('Shared Bank', 'SHARED')
        RETURNING "id"
      `,
    );

    await dataSource.query(
      `
        INSERT INTO "accounts" ("user_id", "name", "currency", "institution_id")
        VALUES
          ($1, 'First account', 'USD', $3),
          ($2, 'Second account', 'USD', $3)
      `,
      [firstUserId, secondUserId, institutionId],
    );

    const queryRunner = dataSource.createQueryRunner();

    try {
      await new InstitutionOwnership1761000000000().up(queryRunner);
    } finally {
      await queryRunner.release();
    }

    await expect(
      dataSource.query(
        `
          SELECT i."user_id", COUNT(*)::int AS owned_count
          FROM "institutions" i
          WHERE i."code" = 'SHARED'
          GROUP BY i."user_id"
          ORDER BY i."user_id" ASC
        `,
      ),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user_id: firstUserId, owned_count: 1 }),
        expect.objectContaining({ user_id: secondUserId, owned_count: 1 }),
      ]),
    );

    await expect(
      dataSource.query(
        `
          SELECT a."user_id", i."user_id" AS institution_owner_id
          FROM "accounts" a
          JOIN "institutions" i ON i."id" = a."institution_id"
          WHERE a."name" IN ('First account', 'Second account')
          ORDER BY a."user_id" ASC
        `,
      ),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user_id: firstUserId, institution_owner_id: firstUserId }),
        expect.objectContaining({ user_id: secondUserId, institution_owner_id: secondUserId }),
      ]),
    );
  }, 20000);
});
