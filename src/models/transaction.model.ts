import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { CategoryModel, UserModel } from '.';
import { type CurrencyEnum, MonthEnum, TransactionType } from '../enums';
import FinancialGoalModel from './financial_goals.model';

@Table({ modelName: 'transactions', paranoid: true })
export class TransactionModel extends Model<TransactionModel> {
  @Column({
    allowNull: false,
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    unique: true,
    primaryKey: true,
  })
  declare transactionId: string;

  @Column({ allowNull: false, type: DataType.ENUM(...Object.values(TransactionType)) })
  declare type: TransactionType;

  @Column({ allowNull: false, type: DataType.STRING })
  declare amount: number;

  @Column({ allowNull: false, type: DataType.STRING })
  declare currency: CurrencyEnum;

  @Column({ allowNull: true, type: DataType.STRING })
  declare note: string;

  @Column({
    allowNull: true,
    type: DataType.STRING,
  })
  declare day: number;

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
    allowNull: true,
    type: DataType.DOUBLE,
  })
  declare exchangeRate: number | null;

  @Column({ type: DataType.DATE })
  declare deletedAt: Date;

  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUIDV4 })
  declare userId: string;

  @BelongsTo(() => UserModel, 'user_id')
  declare user: UserModel;

  @ForeignKey(() => CategoryModel)
  @Column({ type: DataType.UUIDV4 })
  declare categoryId: string;

  @BelongsTo(() => CategoryModel)
  declare category: CategoryModel;

  @ForeignKey(() => FinancialGoalModel)
  @Column({ type: DataType.UUIDV4 })
  declare goalId: string;

  @BelongsTo(() => FinancialGoalModel)
  declare financialGoal: FinancialGoalModel;
}

export default TransactionModel;
