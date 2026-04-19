import type { AccountDTO, CategoryDTO, FinancialGoalDTO } from '..';
import type { CurrencyEnum, TransactionType } from '../../enums';

export type TransferDirection = 'OUTGOING' | 'INCOMING';

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
  accountId: string | null;
  obligationId?: string | null;
  recurringTransactionId?: string | null;
  transferGroupId?: string | null;
  transferDirection?: TransferDirection | null;
  counterpartyAccountId?: string | null;
  category?: CategoryDTO;
  financialGoal?: FinancialGoalDTO;
  account?: AccountDTO | null;
  counterpartyAccount?: AccountDTO | null;
}
