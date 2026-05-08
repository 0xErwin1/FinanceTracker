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
import { Account } from './account.entity';
import { User } from './user.entity';

@Entity('institutions')
@Index('UQ_institutions_user_code', ['userId', 'code'], { unique: true })
export class Institution {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  code!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(
    () => User,
    (user) => user.institutions,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(
    () => Account,
    (account) => account.institution,
  )
  accounts!: Account[];
}
