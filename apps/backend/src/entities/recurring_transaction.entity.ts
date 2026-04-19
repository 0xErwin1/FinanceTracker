import { CurrencyEnum, TransactionType } from '@expenses/api';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { Account } from './account.entity';
import { FinancialGoal } from './financial_goal.entity';
import { Transaction } from './transaction.entity';
import { User } from './user.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value ? Number.parseFloat(value) : null),
};

@Entity('recurring_transactions')
@Index('IDX_recurring_transactions_user_active', ['userId', 'active'])
export class RecurringTransaction {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2, transformer: decimalTransformer })
  amount!: number;

  @Column({ type: 'enum', enum: CurrencyEnum })
  currency!: CurrencyEnum;

  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'integer' })
  dayOfMonth!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastGeneratedAt!: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true, transformer: decimalTransformer })
  exchangeRate!: number | null;

  @Column({ type: 'uuid', nullable: true })
  goalId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  accountId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date;

  @ManyToOne(
    () => User,
    (user) => user.recurringTransactions,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @ManyToOne(() => FinancialGoal)
  @JoinColumn({ name: 'goal_id' })
  financialGoal!: FinancialGoal;

  @ManyToOne(
    () => Account,
    (account) => account.recurringTransactions,
  )
  @JoinColumn({ name: 'account_id' })
  account!: Account | null;

  @OneToMany(
    () => Transaction,
    (transaction) => transaction.recurringTransaction,
  )
  generatedTransactions!: Transaction[];
}
