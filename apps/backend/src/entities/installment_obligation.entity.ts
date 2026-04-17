import { ObligationStatus } from '@expenses/api';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { InstallmentPlan } from './installment_plan.entity';
import { Transaction } from './transaction.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value ? Number.parseFloat(value) : null),
};

@Entity('installment_obligations')
@Index('IDX_installment_obligations_plan_status', ['planId', 'status'])
export class InstallmentObligation {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  planId!: string;

  @Column({ type: 'integer' })
  installmentNumber!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, transformer: decimalTransformer })
  amount!: number;

  @Column({ type: 'date' })
  dueDate!: string;

  @Column({ type: 'enum', enum: ObligationStatus, default: ObligationStatus.PENDING })
  status!: ObligationStatus;

  @Column({ type: 'uuid', nullable: true })
  transactionId!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(
    () => InstallmentPlan,
    (plan) => plan.obligations,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'plan_id' })
  plan!: InstallmentPlan;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'transaction_id' })
  transaction!: Transaction | null;
}
