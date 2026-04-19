import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Account } from './account.entity';

@Entity('institutions')
export class Institution {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 128, nullable: true, unique: true })
  code!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(
    () => Account,
    (account) => account.institution,
  )
  accounts!: Account[];
}
