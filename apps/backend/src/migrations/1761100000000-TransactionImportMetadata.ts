import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TransactionImportMetadata1761100000000 implements MigrationInterface {
  name = 'TransactionImportMetadata1761100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD COLUMN IF NOT EXISTS "external_reference" text,
      ADD COLUMN IF NOT EXISTS "import_source" character varying(64),
      ADD COLUMN IF NOT EXISTS "import_batch_id" character varying(64),
      ADD COLUMN IF NOT EXISTS "import_fingerprint" character varying(64)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_transactions_user_import_fingerprint_active"
      ON "transactions" ("user_id", "import_fingerprint")
      WHERE "deleted_at" IS NULL AND "import_fingerprint" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_transactions_user_import_fingerprint_active"`);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP COLUMN IF EXISTS "import_fingerprint",
      DROP COLUMN IF EXISTS "import_batch_id",
      DROP COLUMN IF EXISTS "import_source",
      DROP COLUMN IF EXISTS "external_reference"
    `);
  }
}
