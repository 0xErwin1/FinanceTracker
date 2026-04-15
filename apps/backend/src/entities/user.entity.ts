import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Budget } from './budget.entity';
import { Category } from './category.entity';
import { FinancialGoal } from './financial_goal.entity';
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

  @CreateDateColumn()
  createdAt!: Date;

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
}
