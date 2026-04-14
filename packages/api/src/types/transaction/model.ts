import { Exclude, Expose, Type } from 'class-transformer';
import { CategoryDTO, FinancialGoalDTO, UserDTO } from '..';
import type { CurrencyEnum, MonthEnum, TransactionType } from '../../enums';

@Exclude()
export class TransactionDTO {
  @Expose()
  declare readonly transactionId: string;

  @Expose()
  declare readonly type: TransactionType;

  @Expose()
  declare readonly amount: number;

  @Expose()
  declare readonly currency: CurrencyEnum;

  @Expose()
  declare readonly note: string;

  @Expose()
  declare readonly day: number;

  @Expose()
  declare readonly month: MonthEnum;

  @Expose()
  declare readonly year: number;

  @Expose()
  declare readonly exchangeRate: number;

  @Expose()
  declare readonly deletedAt: Date;

  @Expose()
  declare readonly userId: string;

  @Type(() => UserDTO)
  @Expose()
  declare readonly user: UserDTO;

  @Expose()
  declare readonly categoryId: string;

  @Type(() => CategoryDTO)
  @Expose()
  declare readonly category: CategoryDTO;

  @Expose()
  public declare goalId: string;

  @Type(() => FinancialGoalDTO)
  @Expose()
  public declare financialGoal: FinancialGoalDTO;
}
