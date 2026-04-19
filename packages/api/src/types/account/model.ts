import type { CurrencyEnum } from '../../enums';

export type AccountKind = 'checking' | 'savings' | 'cash' | 'credit';

export type AccountOwnership = 'self' | 'third_party' | 'custodial';

export interface InstitutionDTO {
  id: string;
  name: string;
  code: string | null;
  createdAt: Date;
}

export interface AccountDTO {
  id: string;
  userId: string;
  name: string;
  currency: CurrencyEnum;
  kind: AccountKind;
  ownership: AccountOwnership;
  institutionId: string | null;
  importSource?: string | null;
  externalReference?: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  institution?: InstitutionDTO | null;
}

export interface AccountSummaryDTO {
  accountId: string;
  name: string;
  currency: CurrencyEnum;
  ownership: AccountOwnership;
  currentBalance: number;
  archivedAt: Date | null;
  institutionId: string | null;
  lastTransactionDate: string | null;
}
