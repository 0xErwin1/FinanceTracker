import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1744500000000 implements MigrationInterface {
  name = 'InitialSchema1744500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TYPE "public"."transaction_type_enum" AS ENUM('INCOME', 'EXPENSE', 'SAVING', 'INSTALLMENTS')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."currency_enum" AS ENUM('USD', 'UYU', 'EUR')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."financial_goals_type_enum" AS ENUM('SPEND_LESS', 'SAVING')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(255) NOT NULL,
        "first_name" character varying(128) NOT NULL,
        "last_name" character varying(128) NOT NULL,
        "password" character varying(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP DEFAULT NULL,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "token" character varying(500) NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP DEFAULT NULL,
        CONSTRAINT "PK_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" "public"."transaction_type_enum" NOT NULL,
        "name" character varying(128) NOT NULL,
        "icon" character varying(100),
        "color" character varying(7),
        "note" text,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP DEFAULT NULL,
        CONSTRAINT "PK_categories" PRIMARY KEY ("id"),
        CONSTRAINT "FK_categories_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_categories_user_name_type" ON "categories" ("user_id", "name", "type")
    `);

    await queryRunner.query(`
      CREATE TABLE "financial_goals" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" "public"."financial_goals_type_enum" NOT NULL,
        "name" character varying(255) NOT NULL,
        "target_amount" numeric(15,2) NOT NULL,
        "current_amount" numeric(15,2) NOT NULL DEFAULT 0,
        "currency" "public"."currency_enum" NOT NULL,
        "note" text,
        "target_date" date NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP DEFAULT NULL,
        CONSTRAINT "PK_financial_goals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_financial_goals_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_financial_goals_user_target_date" ON "financial_goals" ("user_id", "target_date")
    `);

    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" "public"."transaction_type_enum" NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "currency" "public"."currency_enum" NOT NULL,
        "note" text,
        "date" date NOT NULL,
        "exchange_rate" numeric(10,6),
        "user_id" uuid NOT NULL,
        "category_id" uuid,
        "goal_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP DEFAULT NULL,
        CONSTRAINT "PK_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_transactions_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON UPDATE NO ACTION,
        CONSTRAINT "FK_transactions_goal" FOREIGN KEY ("goal_id") REFERENCES "financial_goals"("id") ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_user_date" ON "transactions" ("user_id", "date")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_user_type" ON "transactions" ("user_id", "type")
    `);

    await queryRunner.query(`
      CREATE TABLE "budgets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "category_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "month" date NOT NULL,
        "amount" numeric(15,2) NOT NULL,
        "alert_threshold" numeric(5,2) DEFAULT 80,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP DEFAULT NULL,
        CONSTRAINT "PK_budgets" PRIMARY KEY ("id"),
        CONSTRAINT "FK_budgets_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_budgets_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_budgets_user_category_month" ON "budgets" ("user_id", "category_id", "month")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_budgets_user_month" ON "budgets" ("user_id", "month")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_budgets_user_month"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_budgets_user_category_month"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "budgets"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_user_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_user_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_financial_goals_user_target_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "financial_goals"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_categories_user_name_type"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "public"."financial_goals_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."currency_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."transaction_type_enum"`);
  }
}
