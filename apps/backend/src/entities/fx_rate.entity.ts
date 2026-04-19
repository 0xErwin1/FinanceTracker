import { CurrencyEnum } from '@expenses/api';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value ? Number.parseFloat(value) : null),
};

@Entity('fx_rates')
@Index('IDX_fx_rates_lookup', ['userId', 'baseCurrency', 'quoteCurrency', 'effectiveDate'])
export class FxRate {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: CurrencyEnum })
  baseCurrency!: CurrencyEnum;

  @Column({ type: 'enum', enum: CurrencyEnum })
  quoteCurrency!: CurrencyEnum;

  @Column({ type: 'decimal', precision: 18, scale: 8, transformer: decimalTransformer })
  rate!: number;

  @Column({ type: 'date' })
  effectiveDate!: string;

  @Column({ type: 'varchar', length: 255 })
  sourceLabel!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(
    () => User,
    (user) => user.fxRates,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
