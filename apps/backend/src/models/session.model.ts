import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { UserModel } from '.';

@Table({ modelName: 'sessions', paranoid: true })
export class SessionModel extends Model<SessionModel> {
  @Column({
    allowNull: false,
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    unique: true,
    primaryKey: true,
  })
  declare sessionId: string;

  @Column({ allowNull: false, type: DataType.STRING })
  declare token: string;

  @Column({ type: DataType.DATE })
  declare deletedAt: Date;

  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUIDV4 })
  declare userId: string;

  @BelongsTo(() => UserModel, 'user_id')
  declare user: UserModel;
}

export default SessionModel;
