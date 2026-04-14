import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { CategoryModel, FinancialGoalModel, SessionModel, TransactionModel } from '.';

@Table({
  modelName: 'users',
  paranoid: true,
})
export class UserModel extends Model<UserModel> {
  @Column({
    allowNull: false,
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    unique: true,
    primaryKey: true,
  })
  declare userId: string;

  @Column({ allowNull: false, unique: true, type: DataType.STRING })
  declare email: string;

  @Column({ allowNull: false, type: DataType.STRING })
  declare firstName: string;

  @Column({ allowNull: false, type: DataType.STRING })
  declare lastName: string;

  @Column({ allowNull: false, type: DataType.STRING })
  declare password: string;

  @Column({ type: DataType.DATE })
  declare deletedAt: Date;

  @HasMany(() => SessionModel, 'user_id')
  declare sessions: SessionModel[];

  @HasMany(() => TransactionModel, 'user_id')
  declare trasactions: TransactionModel[];

  @HasMany(() => CategoryModel, 'user_id')
  declare categories: CategoryModel[];

  @HasMany(() => FinancialGoalModel, 'user_id')
  declare financialGoals: FinancialGoalModel[];
}

export default UserModel;
