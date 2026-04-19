import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MultiCurrencyPreferencesAndRates1760900000000 implements MigrationInterface {
  name = 'MultiCurrencyPreferencesAndRates1760900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "reporting_currency" "public"."currency_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "valuation_freshness_days" integer
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "valuation_freshness_days" = 3
      WHERE "valuation_freshness_days" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "valuation_freshness_days" SET DEFAULT 3
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "valuation_freshness_days" SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fx_rates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "base_currency" "public"."currency_enum" NOT NULL,
        "quote_currency" "public"."currency_enum" NOT NULL,
        "rate" numeric(18,8) NOT NULL,
        "effective_date" date NOT NULL,
        "source_label" character varying(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fx_rates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fx_rates_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_fx_rates_lookup"
      ON "fx_rates" ("user_id", "base_currency", "quote_currency", "effective_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_fx_rates_lookup"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fx_rates"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "valuation_freshness_days"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "reporting_currency"`);
  }
}
