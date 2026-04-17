import type { CurrencyEnum } from '../../enums';

export type PlanStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type ObligationStatus = 'PENDING' | 'PAID' | 'SKIPPED';

export interface InstallmentPlanDTO {
  id: string;
  userId: string;
  totalAmount: number;
  currency: CurrencyEnum;
  installmentsCount: number;
  categoryId: string | null;
  note: string | null;
  status: PlanStatus;
  obligations?: InstallmentObligationDTO[];
  createdAt: string;
}

export interface InstallmentObligationDTO {
  id: string;
  planId: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: ObligationStatus;
  transactionId: string | null;
  paidAt: string | null;
}
