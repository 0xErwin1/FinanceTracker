import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RecurringTransactions1744600000000 implements MigrationInterface {
  name = 'RecurringTransactions1744600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "recurring_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "type" "public"."transaction_type_enum" NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "currency" "public"."currency_enum" NOT NULL,
        "category_id" uuid,
        "note" text,
        "day_of_month" integer NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "start_date" date NOT NULL,
        "end_date" date,
        "last_generated_at" TIMESTAMP,
        "exchange_rate" numeric(10,6),
        "goal_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP DEFAULT NULL,
        CONSTRAINT "PK_recurring_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_recurring_transactions_day_of_month" CHECK ("day_of_month" >= 1 AND "day_of_month" <= 31),
        CONSTRAINT "FK_recurring_transactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_recurring_transactions_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON UPDATE NO ACTION,
        CONSTRAINT "FK_recurring_transactions_goal" FOREIGN KEY ("goal_id") REFERENCES "financial_goals"("id") ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_recurring_transactions_user_active" ON "recurring_transactions" ("user_id", "active")
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions" ADD COLUMN "recurring_transaction_id" uuid
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_transactions_recurring_dedup"
        ON "transactions" ("recurring_transaction_id", "date")
        WHERE "recurring_transaction_id" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
        ADD CONSTRAINT "FK_transactions_recurring"
        FOREIGN KEY ("recurring_transaction_id") REFERENCES "recurring_transactions"("id") ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "FK_transactions_recurring"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_recurring_dedup"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "recurring_transaction_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_recurring_transactions_user_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recurring_transactions"`);
  }
}
