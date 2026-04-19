import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountOwnershipBackfill1744810000000 implements MigrationInterface {
  name = 'AccountOwnershipBackfill1744810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "accounts"
      ADD COLUMN IF NOT EXISTS "ownership" character varying(32)
    `);

    await queryRunner.query(`
      UPDATE "accounts"
      SET "ownership" = 'self'
      WHERE "ownership" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "accounts"
      ALTER COLUMN "ownership" SET DEFAULT 'self'
    `);

    await queryRunner.query(`
      ALTER TABLE "accounts"
      ALTER COLUMN "ownership" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "accounts"
      DROP COLUMN IF EXISTS "ownership"
    `);
  }
}
