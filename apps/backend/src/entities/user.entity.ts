import { CurrencyEnum } from '@expenses/api';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Account } from './account.entity';
import { Budget } from './budget.entity';
import { Category } from './category.entity';
import { FinancialGoal } from './financial_goal.entity';
import { FxRate } from './fx_rate.entity';
import { Institution } from './institution.entity';
import { RecurringTransaction } from './recurring_transaction.entity';
import { Session } from './session.entity';
import { Transaction } from './transaction.entity';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 128 })
  firstName!: string;

  @Column({ type: 'varchar', length: 128 })
  lastName!: string;

  @Column({ type: 'varchar', length: 255 })
  password!: string;

  @Column({ type: 'enum', enum: CurrencyEnum, nullable: true })
  reportingCurrency!: CurrencyEnum | null;

  @Column({ type: 'integer', default: 3 })
  valuationFreshnessDays!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date;

  @OneToMany(
    () => Session,
    (session) => session.user,
  )
  sessions!: Session[];

  @OneToMany(
    () => Transaction,
    (transaction) => transaction.user,
  )
  transactions!: Transaction[];

  @OneToMany(
    () => Category,
    (category) => category.user,
  )
  categories!: Category[];

  @OneToMany(
    () => FinancialGoal,
    (financialGoal) => financialGoal.user,
  )
  financialGoals!: FinancialGoal[];

  @OneToMany(
    () => Budget,
    (budget) => budget.user,
  )
  budgets!: Budget[];

  @OneToMany(
    () => RecurringTransaction,
    (recurringTransaction) => recurringTransaction.user,
  )
  recurringTransactions!: RecurringTransaction[];

  @OneToMany(
    () => Account,
    (account) => account.user,
  )
  accounts!: Account[];

  @OneToMany(
    () => Institution,
    (institution) => institution.user,
  )
  institutions!: Institution[];

  @OneToMany(
    () => FxRate,
    (fxRate) => fxRate.user,
  )
  fxRates!: FxRate[];
}
