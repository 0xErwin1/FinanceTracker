import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountsBankingFoundation1744800000000 implements MigrationInterface {
  name = 'AccountsBankingFoundation1744800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "institutions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "code" character varying(128),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_institutions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_institutions_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "currency" "public"."currency_enum" NOT NULL,
        "kind" character varying(32) NOT NULL DEFAULT 'checking',
        "ownership" character varying(32) NOT NULL DEFAULT 'self',
        "institution_id" uuid,
        "import_source" character varying(255),
        "external_reference" character varying(255),
        "archived_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accounts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_accounts_institution" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_accounts_user_currency" ON "accounts" ("user_id", "currency")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_accounts_user_name_currency" ON "accounts" ("user_id", "name", "currency")
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD COLUMN "account_id" uuid,
      ADD COLUMN "transfer_group_id" uuid,
      ADD COLUMN "transfer_direction" character varying(16),
      ADD COLUMN "counterparty_account_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "recurring_transactions"
      ADD COLUMN "account_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "installment_plans"
      ADD COLUMN "account_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "FK_transactions_account"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "FK_transactions_counterparty_account"
      FOREIGN KEY ("counterparty_account_id") REFERENCES "accounts"("id") ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "recurring_transactions"
      ADD CONSTRAINT "FK_recurring_transactions_account"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "installment_plans"
      ADD CONSTRAINT "FK_installment_plans_account"
      FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_transfer_group" ON "transactions" ("transfer_group_id")
    `);

    await queryRunner.query(`
      INSERT INTO "accounts" ("user_id", "name", "currency", "kind", "import_source")
      SELECT DISTINCT source."user_id", CONCAT('Imported ', source."currency"), source."currency", 'checking', 'legacy-backfill'
      FROM (
        SELECT "user_id", "currency" FROM "transactions" WHERE "deleted_at" IS NULL
        UNION
        SELECT "user_id", "currency" FROM "recurring_transactions" WHERE "deleted_at" IS NULL
        UNION
        SELECT "user_id", "currency" FROM "installment_plans" WHERE "deleted_at" IS NULL
      ) AS source
      ON CONFLICT ("user_id", "name", "currency") DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE "transactions" AS transaction
      SET "account_id" = account."id"
      FROM "accounts" AS account
      WHERE transaction."user_id" = account."user_id"
        AND transaction."currency" = account."currency"
        AND account."name" = CONCAT('Imported ', transaction."currency")
        AND transaction."account_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "recurring_transactions" AS recurring
      SET "account_id" = account."id"
      FROM "accounts" AS account
      WHERE recurring."user_id" = account."user_id"
        AND recurring."currency" = account."currency"
        AND account."name" = CONCAT('Imported ', recurring."currency")
        AND recurring."account_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "installment_plans" AS plan
      SET "account_id" = account."id"
      FROM "accounts" AS account
      WHERE plan."user_id" = account."user_id"
        AND plan."currency" = account."currency"
        AND account."name" = CONCAT('Imported ', plan."currency")
        AND plan."account_id" IS NULL
    `);

    const duplicateImportedAccounts = await queryRunner.query(`
      SELECT account."user_id", account."currency", COUNT(*) AS count
      FROM "accounts" AS account
      WHERE account."import_source" = 'legacy-backfill'
      GROUP BY account."user_id", account."currency"
      HAVING COUNT(*) > 1
    `);

    const unmappedRows = await queryRunner.query(`
      SELECT
        (SELECT COUNT(*) FROM "transactions" WHERE "deleted_at" IS NULL AND "account_id" IS NULL) AS transactions_missing_account,
        (SELECT COUNT(*) FROM "recurring_transactions" WHERE "deleted_at" IS NULL AND "account_id" IS NULL) AS recurring_missing_account,
        (SELECT COUNT(*) FROM "installment_plans" WHERE "deleted_at" IS NULL AND "account_id" IS NULL) AS installment_missing_account
    `);

    if (duplicateImportedAccounts.length > 0 || unmappedRows[0]?.transactions_missing_account !== '0') {
      console.warn('accounts banking foundation verification', {
        duplicateImportedAccounts,
        unmappedRows,
      });
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_transfer_group"`);

    await queryRunner.query(`
      ALTER TABLE "installment_plans" DROP CONSTRAINT IF EXISTS "FK_installment_plans_account"
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_transactions" DROP CONSTRAINT IF EXISTS "FK_recurring_transactions_account"
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "FK_transactions_counterparty_account"
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "FK_transactions_account"
    `);

    await queryRunner.query(`ALTER TABLE "installment_plans" DROP COLUMN IF EXISTS "account_id"`);
    await queryRunner.query(`ALTER TABLE "recurring_transactions" DROP COLUMN IF EXISTS "account_id"`);
    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP COLUMN IF EXISTS "counterparty_account_id",
      DROP COLUMN IF EXISTS "transfer_direction",
      DROP COLUMN IF EXISTS "transfer_group_id",
      DROP COLUMN IF EXISTS "account_id"
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_accounts_user_name_currency"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_accounts_user_currency"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "accounts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "institutions"`);
  }
}
