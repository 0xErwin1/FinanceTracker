import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InstallmentsRedesign1744700000000 implements MigrationInterface {
  name = 'InstallmentsRedesign1744700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Step 1: Create new enums ──
    await queryRunner.query(`
      CREATE TYPE "public"."plan_status_enum" AS ENUM('ACTIVE', 'COMPLETED', 'CANCELLED')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."obligation_status_enum" AS ENUM('PENDING', 'PAID', 'SKIPPED')
    `);

    // ── Step 2: Create installment_plans table ──
    await queryRunner.query(`
      CREATE TABLE "installment_plans" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "total_amount" numeric(15,2) NOT NULL,
        "currency" "public"."currency_enum" NOT NULL,
        "installments_count" integer NOT NULL,
        "category_id" uuid,
        "note" text,
        "status" "public"."plan_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP DEFAULT NULL,
        CONSTRAINT "PK_installment_plans" PRIMARY KEY ("id"),
        CONSTRAINT "FK_installment_plans_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_installment_plans_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON UPDATE NO ACTION,
        CONSTRAINT "CHK_installment_plans_count" CHECK ("installments_count" >= 2)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_installment_plans_user_status" ON "installment_plans" ("user_id", "status")
    `);

    // ── Step 3: Create installment_obligations table ──
    await queryRunner.query(`
      CREATE TABLE "installment_obligations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "plan_id" uuid NOT NULL,
        "installment_number" integer NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "due_date" date NOT NULL,
        "status" "public"."obligation_status_enum" NOT NULL DEFAULT 'PENDING',
        "transaction_id" uuid,
        "paid_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_installment_obligations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_installment_obligations_plan" FOREIGN KEY ("plan_id") REFERENCES "installment_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_installment_obligations_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_installment_obligations_plan_status" ON "installment_obligations" ("plan_id", "status")
    `);

    // ── Step 4: Add obligation_id column to transactions ──
    await queryRunner.query(`
      ALTER TABLE "transactions" ADD COLUMN "obligation_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD CONSTRAINT "FK_transactions_obligation"
        FOREIGN KEY ("obligation_id") REFERENCES "installment_obligations"("id") ON UPDATE NO ACTION
    `);

    // ── Step 5: Data transformation ──
    // For each parent transaction (type=INSTALLMENTS, installment_plan_id IS NULL):
    //   create an InstallmentPlan row.
    await queryRunner.query(`
      INSERT INTO "installment_plans" (id, user_id, total_amount, currency, installments_count, category_id, note, status, created_at)
      SELECT
        p.id,
        p.user_id,
        p.amount,
        p.currency,
        COALESCE(p.total_installments, 2),
        p.category_id,
        p.note,
        (CASE
          WHEN EXISTS (
            SELECT 1 FROM "transactions" c
            WHERE c.installment_plan_id = p.id
              AND c.type = 'INSTALLMENTS'
              AND c.deleted_at IS NULL
              AND c.date <= CURRENT_DATE
          ) AND NOT EXISTS (
            SELECT 1 FROM "transactions" c
            WHERE c.installment_plan_id = p.id
              AND c.type = 'INSTALLMENTS'
              AND c.deleted_at IS NULL
              AND c.date > CURRENT_DATE
          ) THEN 'COMPLETED'
          ELSE 'ACTIVE'
        END)::"public"."plan_status_enum",
        p.created_at
      FROM "transactions" p
      WHERE p.type = 'INSTALLMENTS'
        AND p.installment_plan_id IS NULL
        AND p.deleted_at IS NULL
    `);

    // For each child transaction (type=INSTALLMENTS, installment_plan_id IS NOT NULL):
    //   create an InstallmentObligation row.
    //   Past children (date <= today) → status=PAID, paid_at=date
    //   Future children (date > today) → status=PENDING
    await queryRunner.query(`
      INSERT INTO "installment_obligations" (id, plan_id, installment_number, amount, due_date, status, paid_at, transaction_id, created_at)
      SELECT
        c.id,
        c.installment_plan_id,
        COALESCE(c.installment_number, 1),
        c.amount,
        c.date,
        (CASE
          WHEN c.date <= CURRENT_DATE THEN 'PAID'
          ELSE 'PENDING'
        END)::"public"."obligation_status_enum",
        CASE
          WHEN c.date <= CURRENT_DATE THEN c.created_at
          ELSE NULL
        END,
        CASE
          WHEN c.date <= CURRENT_DATE THEN c.id
          ELSE NULL
        END,
        c.created_at
      FROM "transactions" c
      WHERE c.type = 'INSTALLMENTS'
        AND c.installment_plan_id IS NOT NULL
        AND c.deleted_at IS NULL
    `);

    // For each PAID child: convert the transaction row to type=EXPENSE
    // and link it to the new obligation via obligation_id
    await queryRunner.query(`
      UPDATE "transactions" c
      SET
        type = 'EXPENSE',
        obligation_id = c.id
      WHERE c.type = 'INSTALLMENTS'
        AND c.installment_plan_id IS NOT NULL
        AND c.deleted_at IS NULL
        AND c.date <= CURRENT_DATE
    `);

    // For each PENDING (future) child: soft-delete the transaction
    // (it exists now only as an InstallmentObligation)
    await queryRunner.query(`
      UPDATE "transactions"
      SET deleted_at = NOW()
      WHERE type = 'INSTALLMENTS'
        AND installment_plan_id IS NOT NULL
        AND deleted_at IS NULL
        AND date > CURRENT_DATE
    `);

    // Soft-delete all parent INSTALLMENTS transactions
    await queryRunner.query(`
      UPDATE "transactions"
      SET deleted_at = NOW()
      WHERE type = 'INSTALLMENTS'
        AND installment_plan_id IS NULL
        AND deleted_at IS NULL
    `);

    // ── Step 6: Drop old columns and constraints ──
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "FK_transactions_installment_plan"`,
    );
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "installment_plan_id"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "total_installments"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "installment_number"`);

    // Normalize any remaining INSTALLMENTS values before rebuilding the shared enum.
    // Soft-deleted rows still participate in ALTER COLUMN TYPE casts, so merely
    // deleting them logically is not enough.
    await queryRunner.query(`
      UPDATE "transactions"
      SET type = 'EXPENSE'
      WHERE type = 'INSTALLMENTS'
    `);
    await queryRunner.query(`
      UPDATE "categories"
      SET type = 'EXPENSE'
      WHERE type = 'INSTALLMENTS'
    `);
    await queryRunner.query(`
      UPDATE "recurring_transactions"
      SET type = 'EXPENSE'
      WHERE type = 'INSTALLMENTS'
    `);

    // ── Step 7: Remove INSTALLMENTS from transaction_type_enum ──
    // PostgreSQL doesn't support ALTER TYPE REMOVE VALUE, so we must rebuild the enum.
    await queryRunner.query(`
      ALTER TABLE "transactions" ALTER COLUMN "type" TYPE text
    `);
    await queryRunner.query(`
      ALTER TABLE "categories" ALTER COLUMN "type" TYPE text
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_transactions" ALTER COLUMN "type" TYPE text
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."transaction_type_enum"`);
    await queryRunner.query(`
      CREATE TYPE "public"."transaction_type_enum" AS ENUM('INCOME', 'EXPENSE', 'SAVING')
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "public"."transaction_type_enum" USING "type"::"public"."transaction_type_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "categories" ALTER COLUMN "type" TYPE "public"."transaction_type_enum" USING "type"::"public"."transaction_type_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_transactions" ALTER COLUMN "type" TYPE "public"."transaction_type_enum" USING "type"::"public"."transaction_type_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Reverse Step 7: Restore INSTALLMENTS in enum ──
    await queryRunner.query(`
      ALTER TABLE "transactions" ALTER COLUMN "type" TYPE text
    `);
    await queryRunner.query(`
      ALTER TABLE "categories" ALTER COLUMN "type" TYPE text
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_transactions" ALTER COLUMN "type" TYPE text
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."transaction_type_enum"`);
    await queryRunner.query(`
      CREATE TYPE "public"."transaction_type_enum" AS ENUM('INCOME', 'EXPENSE', 'SAVING', 'INSTALLMENTS')
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "public"."transaction_type_enum" USING "type"::"public"."transaction_type_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "categories" ALTER COLUMN "type" TYPE "public"."transaction_type_enum" USING "type"::"public"."transaction_type_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "recurring_transactions" ALTER COLUMN "type" TYPE "public"."transaction_type_enum" USING "type"::"public"."transaction_type_enum"
    `);

    // ── Reverse Step 6: Re-add old columns ──
    await queryRunner.query(`
      ALTER TABLE "transactions" ADD COLUMN "installment_plan_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions" ADD COLUMN "total_installments" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions" ADD COLUMN "installment_number" integer
    `);

    // ── Reverse Step 5: Re-create parent INSTALLMENTS from plans ──
    // Re-create parent transactions from installment_plans
    await queryRunner.query(`
      UPDATE "transactions" t
      SET deleted_at = NULL, type = 'INSTALLMENTS',
          total_installments = sub.count, installment_plan_id = NULL
      FROM (
        SELECT p.id as plan_id, p.installments_count as count
        FROM "installment_plans" p
        WHERE p.deleted_at IS NULL
      ) sub
      WHERE t.id = sub.plan_id
    `);

    // Re-create children from obligations: PAID → INSTALLMENTS (date, undelete), PENDING → INSTALLMENTS (date, undelete)
    await queryRunner.query(`
      UPDATE "transactions" t
      SET deleted_at = NULL, type = 'INSTALLMENTS',
          installment_number = sub.inst_num, installment_plan_id = sub.plan_id
      FROM (
        SELECT o.id as obl_id, o.installment_number as inst_num, o.plan_id
        FROM "installment_obligations" o
      ) sub
      WHERE t.id = sub.obl_id
    `);

    // ── Reverse Steps 1-4: Drop new schema ──
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "FK_transactions_obligation"`,
    );
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "obligation_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_installment_obligations_plan_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "installment_obligations"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_installment_plans_user_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "installment_plans"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."obligation_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."plan_status_enum"`);
  }
}
