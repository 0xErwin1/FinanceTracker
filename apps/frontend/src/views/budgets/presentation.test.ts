import { CurrencyEnum, type ValuationSnapshotDTO } from '@expenses/api';
import { describe, expect, it } from 'vitest';
import { buildBudgetCardItem } from './presentation';

function makeValuationSnapshot(overrides: Partial<ValuationSnapshotDTO> = {}): ValuationSnapshotDTO {
  return {
    reportingCurrency: overrides.reportingCurrency ?? CurrencyEnum.USD,
    valuationDate: overrides.valuationDate ?? '2026-04-19',
    coverage: overrides.coverage ?? 'complete',
    estimatedTotal: overrides.estimatedTotal ?? 168,
    nativeTotals: overrides.nativeTotals ?? { USD: 120, EUR: 40, UYU: 0 },
    coveredCurrencies: overrides.coveredCurrencies ?? [CurrencyEnum.USD, CurrencyEnum.EUR],
    missingCurrencies: overrides.missingCurrencies ?? [],
    staleCurrencies: overrides.staleCurrencies ?? [],
    sourceLabels: overrides.sourceLabels ?? ['Manual close'],
    effectiveDates: overrides.effectiveDates ?? ['2026-04-18'],
  };
}

function makeAlert(
  overrides: Partial<{
    budget: {
      id: string;
      categoryId: string;
      userId: string;
      month: string;
      amount: number;
      alertThreshold: number | null;
      createdAt: Date;
    };
    spent: number;
    percentage: number;
    isOverBudget: boolean;
    isNearLimit: boolean;
    nativeSpentByCurrency?: Record<string, number>;
    valuationSnapshot?: ValuationSnapshotDTO | null;
  }> = {},
) {
  return {
    budget: {
      id: overrides.budget?.id ?? 'budget-1',
      categoryId: overrides.budget?.categoryId ?? 'category-1',
      userId: overrides.budget?.userId ?? 'user-1',
      month: overrides.budget?.month ?? '2026-04-01',
      amount: overrides.budget?.amount ?? 500,
      alertThreshold: overrides.budget?.alertThreshold ?? 80,
      createdAt: overrides.budget?.createdAt ?? new Date('2026-04-01T00:00:00.000Z'),
    },
    spent: overrides.spent ?? 120,
    percentage: overrides.percentage ?? 24,
    isOverBudget: overrides.isOverBudget ?? false,
    isNearLimit: overrides.isNearLimit ?? false,
    nativeSpentByCurrency: overrides.nativeSpentByCurrency,
    valuationSnapshot: overrides.valuationSnapshot,
  };
}

describe('buildBudgetCardItem', () => {
  it('uses the backend native subtotal when a budget only spent in one currency', () => {
    const item = buildBudgetCardItem(makeAlert({ nativeSpentByCurrency: { USD: 120 } }), 'Groceries');

    expect(item).toMatchObject({
      categoryName: 'Groceries',
      currency: CurrencyEnum.USD,
      spent: 120,
      percentage: 24,
      hasMixedSpend: false,
      nativeSpent: [{ currency: CurrencyEnum.USD, amount: 120 }],
      estimatedSpent: null,
      estimatedSpentCurrency: null,
    });
  });

  it('keeps mixed-currency spend as native subtotals and only exposes estimates with labels', () => {
    const item = buildBudgetCardItem(
      makeAlert({
        spent: 160,
        percentage: 32,
        nativeSpentByCurrency: { USD: 120, EUR: 40 },
        valuationSnapshot: makeValuationSnapshot({ coverage: 'stale', estimatedTotal: 168 }),
      }),
      'Travel',
    );

    expect(item).toMatchObject({
      categoryName: 'Travel',
      currency: null,
      spent: null,
      percentage: null,
      hasMixedSpend: true,
      nativeSpent: [
        { currency: CurrencyEnum.EUR, amount: 40 },
        { currency: CurrencyEnum.USD, amount: 120 },
      ],
      estimatedSpent: 168,
      estimatedSpentCurrency: CurrencyEnum.USD,
    });
  });
});
