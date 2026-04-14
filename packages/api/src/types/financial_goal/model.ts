import { Exclude, Expose, Type } from 'class-transformer';
import { TransactionDTO, UserDTO } from '..';
import type { CurrencyEnum, FinancialGoalsType, MonthEnum } from '../../enums';

@Exclude()
export class FinancialGoalDTO {
  @Expose()
  declare readonly goalId: string;

  @Expose()
  declare readonly type: FinancialGoalsType;

  @Expose()
  declare readonly targetAmount: number;

  @Expose()
  declare readonly currency: CurrencyEnum;

  @Expose()
  declare readonly currentAmount: number;

  @Expose()
  declare readonly name: string;

  @Expose()
  declare readonly note: string;

  @Expose()
  declare readonly month: MonthEnum;

  @Expose()
  declare readonly year: number;

  @Expose()
  declare readonly deletedAt: Date;

  @Expose()
  declare readonly userId: string;

  @Type(() => UserDTO)
  @Expose()
  declare readonly user: UserDTO;

  @Type(() => TransactionDTO)
  @Expose()
  public declare transactions: TransactionDTO[];
}
