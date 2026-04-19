import type { ValuationSnapshotDTO } from '@expenses/api';
import { type CurrencyAmount, summarizeCurrencyMap } from '../multiCurrency';

interface BudgetCardAlertInput {
  budget: {
    id: string;
    categoryId: string;
    amount: number;
    alertThreshold: number | null;
    month: string;
  };
  spent: number;
  nativeSpentByCurrency?: Record<string, number>;
  valuationSnapshot?: ValuationSnapshotDTO | null;
}

export interface BudgetCardItem {
  id: string;
  categoryId: string;
  categoryName: string;
  budgeted: number;
  spent: number | null;
  currency: string | null;
  percentage: number | null;
  estimatedSpent: number | null;
  estimatedSpentCurrency: string | null;
  estimatedPercentage: number | null;
  hasMixedSpend: boolean;
  nativeSpent: CurrencyAmount[];
  valuationSnapshot: ValuationSnapshotDTO | null;
  isOverBudget: boolean;
  isNearLimit: boolean;
  alertThreshold: number | null;
  month: string;
}

function toPercentage(amount: number | null, budgeted: number): number | null {
  if (amount === null || budgeted <= 0) {
    return null;
  }

  return +((amount / budgeted) * 100).toFixed(2);
}

export function buildBudgetCardItem(alert: BudgetCardAlertInput, categoryName: string): BudgetCardItem {
  const budgeted = Number(alert.budget.amount ?? 0);
  const nativeSpentSummary = summarizeCurrencyMap(alert.nativeSpentByCurrency ?? {});
  const singleCurrencySpend = nativeSpentSummary.entries.length === 1 ? nativeSpentSummary.entries[0] : null;
  const valuationSnapshot = alert.valuationSnapshot ?? null;
  const estimatedSpent = nativeSpentSummary.hasMultipleCurrencies
    ? (valuationSnapshot?.estimatedTotal ?? null)
    : null;
  const estimatedSpentCurrency =
    estimatedSpent !== null ? (valuationSnapshot?.reportingCurrency ?? null) : null;
  const spent =
    singleCurrencySpend?.amount ??
    (nativeSpentSummary.entries.length === 0 ? Number(alert.spent ?? 0) : null);
  const percentage = toPercentage(spent, budgeted);
  const estimatedPercentage = toPercentage(estimatedSpent, budgeted);
  const statusPercentage = percentage ?? estimatedPercentage;
  const alertThreshold = alert.budget.alertThreshold ?? null;

  return {
    id: alert.budget.id,
    categoryId: alert.budget.categoryId,
    categoryName,
    budgeted,
    spent,
    currency: singleCurrencySpend?.currency ?? null,
    percentage,
    estimatedSpent,
    estimatedSpentCurrency,
    estimatedPercentage,
    hasMixedSpend: nativeSpentSummary.hasMultipleCurrencies,
    nativeSpent: nativeSpentSummary.entries,
    valuationSnapshot,
    isOverBudget: statusPercentage !== null ? statusPercentage >= 100 : false,
    isNearLimit:
      alertThreshold !== null && statusPercentage !== null ? statusPercentage >= alertThreshold : false,
    alertThreshold,
    month: alert.budget.month,
  };
}
