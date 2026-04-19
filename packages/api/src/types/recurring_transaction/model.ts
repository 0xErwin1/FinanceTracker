import type { CurrencyEnum, TransactionType } from '../../enums';

export interface RecurringTransactionDTO {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyEnum;
  categoryId: string | null;
  note: string | null;
  dayOfMonth: number;
  active: boolean;
  startDate: string;
  endDate: string | null;
  lastGeneratedAt: Date | null;
  exchangeRate: number | null;
  goalId: string | null;
  accountId: string | null;
  createdAt: Date;
}
