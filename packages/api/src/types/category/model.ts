import type { TransactionDTO } from '..';
import type { TransactionType } from '../../enums';

export interface CategoryDTO {
  id: string;
  type: TransactionType;
  name: string;
  note?: string | null;
  deletedAt?: Date | null;
  icon?: string | null;
  color?: string | null;
  userId: string;
  transactions?: TransactionDTO[];
}
