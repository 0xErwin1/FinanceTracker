import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';
import { TransactionModel, UserModel } from '.';
import { CurrencyEnum, FinancialGoalsType, MonthEnum } from '../enums';

@Table({ modelName: 'financial_goals', paranoid: true })
export class FinancialGoalModel extends Model<FinancialGoalModel> {
  @Column({
    allowNull: false,
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    unique: true,
    primaryKey: true,
  })
  declare goalId: string;

  @Column({
    allowNull: false,
    type: DataType.ENUM(...Object.values(FinancialGoalsType)),
  })
  declare type: FinancialGoalsType;

  @Column({ allowNull: false, type: DataType.DOUBLE })
  declare targetAmount: number;

  @Column({ allowNull: false, type: DataType.ENUM(...Object.values(CurrencyEnum)) })
  declare currency: CurrencyEnum;

  @Column({ allowNull: true, type: DataType.DOUBLE })
  declare currentAmount: number;

  @Column({ allowNull: false, type: DataType.STRING })
  declare name: string;

  @Column({ allowNull: true, type: DataType.STRING })
  declare note: string;

  @Column({
    allowNull: false,
    type: DataType.ENUM(...Object.values(MonthEnum)),
  })
  declare month: MonthEnum;

  @Column({
    allowNull: false,
    type: DataType.INTEGER,
  })
  declare year: number;

  @Column({
    type: DataType.DATE,
  })
  declare deletedAt: Date;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUIDV4,
  })
  declare userId: string;

  @BelongsTo(() => UserModel, 'user_id')
  declare user: UserModel;

  @HasMany(() => TransactionModel, 'goal_id')
  declare transaction: TransactionModel;
}

export default FinancialGoalModel;
