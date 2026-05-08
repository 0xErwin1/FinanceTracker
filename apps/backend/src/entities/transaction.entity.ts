import { CurrencyEnum, TransactionType } from '@expenses/api';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Account } from './account.entity';
import { Category } from './category.entity';
import { FinancialGoal } from './financial_goal.entity';
import { InstallmentObligation } from './installment_obligation.entity';
import { RecurringTransaction } from './recurring_transaction.entity';
import { User } from './user.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value ? Number.parseFloat(value) : null),
};

@Entity('transactions')
@Index('IDX_transactions_user_date', ['userId', 'date'])
@Index('IDX_transactions_user_type', ['userId', 'type'])
@Index('UQ_transactions_user_import_fingerprint_active', ['userId', 'importFingerprint'], {
  unique: true,
  where: 'deleted_at IS NULL AND import_fingerprint IS NOT NULL',
})
export class Transaction {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2, transformer: decimalTransformer })
  amount!: number;

  @Column({ type: 'enum', enum: CurrencyEnum })
  currency!: CurrencyEnum;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'text', nullable: true })
  externalReference!: string | null;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true, transformer: decimalTransformer })
  exchangeRate!: number | null;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  goalId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  recurringTransactionId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  obligationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  accountId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  transferGroupId!: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  transferDirection!: 'OUTGOING' | 'INCOMING' | null;

  @Column({ type: 'uuid', nullable: true })
  counterpartyAccountId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  importSource!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  importBatchId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  importFingerprint!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date;

  @ManyToOne(
    () => User,
    (user) => user.transactions,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(
    () => Category,
    (category) => category.transactions,
  )
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @ManyToOne(
    () => FinancialGoal,
    (financialGoal) => financialGoal.transactions,
  )
  @JoinColumn({ name: 'goal_id' })
  financialGoal!: FinancialGoal;

  @ManyToOne(
    () => RecurringTransaction,
    (recurringTransaction) => recurringTransaction.generatedTransactions,
  )
  @JoinColumn({ name: 'recurring_transaction_id' })
  recurringTransaction!: RecurringTransaction;

  @ManyToOne(() => InstallmentObligation)
  @JoinColumn({ name: 'obligation_id' })
  obligation!: InstallmentObligation | null;

  @ManyToOne(
    () => Account,
    (account) => account.transactions,
  )
  @JoinColumn({ name: 'account_id' })
  account!: Account | null;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'counterparty_account_id' })
  counterpartyAccount!: Account | null;
}
