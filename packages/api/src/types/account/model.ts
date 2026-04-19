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

export type ValuationCoverage = 'complete' | 'partial' | 'missing' | 'stale';

export interface FxRateDTO {
  id: string;
  userId: string;
  baseCurrency: CurrencyEnum;
  quoteCurrency: CurrencyEnum;
  rate: number;
  effectiveDate: string;
  sourceLabel: string;
  createdAt: Date;
}

export interface ValuationSnapshotDTO {
  reportingCurrency: CurrencyEnum;
  valuationDate: string;
  coverage: ValuationCoverage;
  estimatedTotal: number | null;
  nativeTotals: Record<CurrencyEnum, number>;
  coveredCurrencies: CurrencyEnum[];
  missingCurrencies: CurrencyEnum[];
  staleCurrencies: CurrencyEnum[];
  sourceLabels: string[];
  effectiveDates: string[];
}
