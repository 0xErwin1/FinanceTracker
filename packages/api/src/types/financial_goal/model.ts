import type { TransactionDTO } from '..';
import type { CurrencyEnum, FinancialGoalsType } from '../../enums';

export interface FinancialGoalDTO {
  id: string;
  type: FinancialGoalsType;
  targetAmount: number;
  currency: CurrencyEnum;
  currentAmount: number;
  name: string;
  note: string | null;
  targetDate: string;
  deletedAt?: Date | null;
  userId: string;
  transactions?: TransactionDTO[];
}
