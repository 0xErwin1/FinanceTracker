import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('sessions')
export class Session {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id!: string;

  @Column({ type: 'varchar', length: 500 })
  token!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(
    () => User,
    (user) => user.sessions,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
