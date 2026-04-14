import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';
import { TransactionModel, UserModel } from '.';
import { TransactionType } from '../enums';

@Table({ modelName: 'categories', paranoid: true })
export class CategoryModel extends Model<CategoryModel> {
  @Column({
    allowNull: false,
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    unique: true,
    primaryKey: true,
  })
  declare categoryId: string;

  @Column({
    allowNull: false,
    type: DataType.ENUM(...Object.values(TransactionType)),
  })
  declare type: TransactionType;

  @Column({
    allowNull: false,
    type: DataType.STRING,
  })
  declare name: string;

  @Column({ allowNull: true, type: DataType.STRING })
  declare note: string;

  @HasMany(() => TransactionModel, 'category_id')
  declare trasactions: TransactionModel[];

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUIDV4,
  })
  declare userId: string;

  @BelongsTo(() => UserModel, 'user_id')
  declare user: UserModel;
}

export default CategoryModel;
