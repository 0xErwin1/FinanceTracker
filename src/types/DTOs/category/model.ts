import { Exclude, Expose, Type } from 'class-transformer';
import { TransactionDTO, UserDTO } from '..';
import type { TransactionType } from '../../../enums/index';

@Exclude()
export class CategoryDTO {
  @Expose()
  declare readonly categoryId: string;

  @Expose()
  declare readonly type: TransactionType;

  @Expose()
  declare readonly name: string;

  @Expose()
  declare readonly note: string;

  @Expose()
  declare readonly userId: string;

  @Type(() => TransactionDTO)
  @Expose()
  declare readonly trasactions: TransactionDTO[];

  @Type(() => UserDTO)
  @Expose()
  declare readonly user: UserDTO[];
}
