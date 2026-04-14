import { Exclude, Expose, Type } from 'class-transformer';
import { CategoryDTO, FinancialGoalDTO, SessionDTO, TransactionDTO } from '..';

@Exclude()
export class UserDTO {
  @Expose()
  declare readonly userId: string;

  @Expose()
  declare readonly email: string;

  @Expose()
  declare readonly firstName: string;

  @Expose()
  declare readonly lastName: string;

  @Expose()
  declare readonly password: string;

  @Expose()
  declare readonly deletedAt: Date;

  @Type(() => SessionDTO)
  @Expose()
  declare readonly sessions: SessionDTO[];

  @Type(() => TransactionDTO)
  @Expose()
  declare readonly trasactions: TransactionDTO[];

  @Type(() => CategoryDTO)
  @Expose()
  declare readonly categories: CategoryDTO[];

  @Type(() => FinancialGoalDTO)
  @Expose()
  declare readonly financialGoals: FinancialGoalDTO[];
}
