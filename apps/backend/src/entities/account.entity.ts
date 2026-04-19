import { CurrencyEnum, type AccountOwnership } from '@expenses/api';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { InstallmentPlan } from './installment_plan.entity';
import { Institution } from './institution.entity';
import { RecurringTransaction } from './recurring_transaction.entity';
import { Transaction } from './transaction.entity';
import { User } from './user.entity';

@Entity('accounts')
@Index('IDX_accounts_user_currency', ['userId', 'currency'])
export class Account {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'enum', enum: CurrencyEnum })
  currency!: CurrencyEnum;

  @Column({ type: 'varchar', length: 32, default: 'checking' })
  kind!: 'checking' | 'savings' | 'cash' | 'credit';

  @Column({ type: 'varchar', length: 32, default: 'self' })
  ownership!: AccountOwnership;

  @Column({ type: 'uuid', nullable: true })
  institutionId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  importSource!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalReference!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(
    () => User,
    (user) => user.accounts,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(
    () => Institution,
    (institution) => institution.accounts,
    { onDelete: 'SET NULL' },
  )
  @JoinColumn({ name: 'institution_id' })
  institution!: Institution | null;

  @OneToMany(
    () => Transaction,
    (transaction) => transaction.account,
  )
  transactions!: Transaction[];

  @OneToMany(
    () => RecurringTransaction,
    (recurringTransaction) => recurringTransaction.account,
  )
  recurringTransactions!: RecurringTransaction[];

  @OneToMany(
    () => InstallmentPlan,
    (installmentPlan) => installmentPlan.account,
  )
  installmentPlans!: InstallmentPlan[];
}
