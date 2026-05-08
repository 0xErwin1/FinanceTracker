import type { BudgetCardItem } from '../budgets/presentation';
import type { CurrencyAmount } from '../multiCurrency';

export interface DashboardBudgetDisplayState {
  mode: 'native' | 'estimated' | 'native-only';
  amount: number | null;
  currency: string | null;
  percentage: number | null;
  progressValue: number | null;
  progressMax: number | null;
  nativeSpent: CurrencyAmount[];
  isEstimated: boolean;
}

function getComparablePercentage(item: BudgetCardItem): number {
  return item.percentage ?? item.estimatedPercentage ?? 0;
}

export function getTopBudgetItems(items: BudgetCardItem[], limit = 3): BudgetCardItem[] {
  return [...items]
    .sort((left, right) => getComparablePercentage(right) - getComparablePercentage(left))
    .slice(0, limit);
}

export function getBudgetDisplayState(item: BudgetCardItem): DashboardBudgetDisplayState {
  if (item.hasMixedSpend) {
    if (
      item.estimatedSpent !== null &&
      item.estimatedSpentCurrency !== null &&
      item.estimatedPercentage !== null
    ) {
      return {
        mode: 'estimated',
        amount: item.estimatedSpent,
        currency: item.estimatedSpentCurrency,
        percentage: item.estimatedPercentage,
        progressValue: item.estimatedSpent,
        progressMax: item.budgeted,
        nativeSpent: item.nativeSpent,
        isEstimated: true,
      };
    }

    return {
      mode: 'native-only',
      amount: null,
      currency: null,
      percentage: null,
      progressValue: null,
      progressMax: null,
      nativeSpent: item.nativeSpent,
      isEstimated: false,
    };
  }

  return {
    mode: 'native',
    amount: item.spent,
    currency: item.currency,
    percentage: item.percentage,
    progressValue: item.spent,
    progressMax: item.budgeted,
    nativeSpent: item.nativeSpent,
    isEstimated: false,
  };
}
