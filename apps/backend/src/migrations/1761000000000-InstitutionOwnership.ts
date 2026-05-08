import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InstitutionOwnership1761000000000 implements MigrationInterface {
  name = 'InstitutionOwnership1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "institutions" DROP CONSTRAINT IF EXISTS "UQ_institutions_code"`);

    await queryRunner.query(`
      ALTER TABLE "institutions"
      ADD COLUMN IF NOT EXISTS "user_id" uuid
    `);

    await queryRunner.query(`
      UPDATE "institutions" institution
      SET "user_id" = owner."user_id"
      FROM (
        SELECT DISTINCT ON ("institution_id") "institution_id", "user_id"
        FROM "accounts"
        WHERE "institution_id" IS NOT NULL
        ORDER BY "institution_id", "user_id"
      ) owner
      WHERE institution."id" = owner."institution_id"
        AND institution."user_id" IS NULL
    `);

    await queryRunner.query(`
      DO $$
      DECLARE ownership_link RECORD;
      DECLARE cloned_institution_id uuid;
      BEGIN
        FOR ownership_link IN
          SELECT DISTINCT account."institution_id", account."user_id"
          FROM "accounts" account
          JOIN "institutions" institution ON institution."id" = account."institution_id"
          WHERE account."institution_id" IS NOT NULL
            AND institution."user_id" IS DISTINCT FROM account."user_id"
          ORDER BY account."institution_id", account."user_id"
        LOOP
          INSERT INTO "institutions" ("name", "code", "created_at", "user_id")
          SELECT institution."name", institution."code", institution."created_at", ownership_link."user_id"
          FROM "institutions" institution
          WHERE institution."id" = ownership_link."institution_id"
          RETURNING "id" INTO cloned_institution_id;

          UPDATE "accounts"
          SET "institution_id" = cloned_institution_id
          WHERE "institution_id" = ownership_link."institution_id"
            AND "user_id" = ownership_link."user_id";
        END LOOP;
      END $$
    `);

    await queryRunner.query(`DELETE FROM "institutions" WHERE "user_id" IS NULL`);

    await queryRunner.query(`
      ALTER TABLE "institutions"
      ADD CONSTRAINT "FK_institutions_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "institutions"
      ALTER COLUMN "user_id" SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_institutions_user_code"
      ON "institutions" ("user_id", "code")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_institutions_user_code"`);
    await queryRunner.query(`ALTER TABLE "institutions" DROP CONSTRAINT IF EXISTS "FK_institutions_user"`);

    await queryRunner.query(`
      DO $$
      DECLARE duplicate_group RECORD;
      BEGIN
        FOR duplicate_group IN
          SELECT MIN("id") AS canonical_id, array_remove(array_agg("id"), MIN("id")) AS duplicate_ids
          FROM "institutions"
          WHERE "code" IS NOT NULL
          GROUP BY "code"
          HAVING COUNT(*) > 1
        LOOP
          UPDATE "accounts"
          SET "institution_id" = duplicate_group.canonical_id
          WHERE "institution_id" = ANY(duplicate_group.duplicate_ids);

          DELETE FROM "institutions"
          WHERE "id" = ANY(duplicate_group.duplicate_ids);
        END LOOP;
      END $$
    `);

    await queryRunner.query(`ALTER TABLE "institutions" DROP COLUMN IF EXISTS "user_id"`);
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD CONSTRAINT "UQ_institutions_code" UNIQUE ("code")`,
    );
  }
}
