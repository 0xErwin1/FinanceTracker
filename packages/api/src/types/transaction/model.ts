import type { CategoryDTO, FinancialGoalDTO } from '..';
import type { CurrencyEnum, TransactionType } from '../../enums';

export interface TransactionDTO {
  id: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyEnum;
  note: string | null;
  date: string;
  exchangeRate?: number | null;
  deletedAt?: Date | null;
  userId: string;
  categoryId: string | null;
  goalId: string | null;
  category?: CategoryDTO;
  financialGoal?: FinancialGoalDTO;
}
