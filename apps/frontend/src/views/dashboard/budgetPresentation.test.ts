import { CurrencyEnum } from '@expenses/api';
import { describe, expect, it } from 'vitest';
import type { BudgetCardItem } from '../budgets/presentation';
import { getBudgetDisplayState, getTopBudgetItems } from './budgetPresentation';

function makeBudget(overrides: Partial<BudgetCardItem> = {}): BudgetCardItem {
  return {
    id: overrides.id ?? 'budget-1',
    categoryId: overrides.categoryId ?? 'category-1',
    categoryName: overrides.categoryName ?? 'Groceries',
    budgeted: overrides.budgeted ?? 500,
    spent: overrides.spent === undefined ? 120 : overrides.spent,
    currency: overrides.currency === undefined ? CurrencyEnum.USD : overrides.currency,
    percentage: overrides.percentage === undefined ? 24 : overrides.percentage,
    estimatedSpent: overrides.estimatedSpent === undefined ? null : overrides.estimatedSpent,
    estimatedSpentCurrency:
      overrides.estimatedSpentCurrency === undefined ? null : overrides.estimatedSpentCurrency,
    estimatedPercentage: overrides.estimatedPercentage === undefined ? null : overrides.estimatedPercentage,
    hasMixedSpend: overrides.hasMixedSpend ?? false,
    nativeSpent: overrides.nativeSpent ?? [{ currency: CurrencyEnum.USD, amount: 120 }],
    valuationSnapshot: overrides.valuationSnapshot ?? null,
    isOverBudget: overrides.isOverBudget ?? false,
    isNearLimit: overrides.isNearLimit ?? false,
    alertThreshold: overrides.alertThreshold ?? 80,
    month: overrides.month ?? '2026-05-01',
  };
}

describe('dashboard budget presentation helpers', () => {
  it('returns a native-only display state for mixed spend without a comparable valuation', () => {
    const state = getBudgetDisplayState(
      makeBudget({
        categoryName: 'Travel',
        spent: null,
        currency: null,
        percentage: null,
        hasMixedSpend: true,
        nativeSpent: [
          { currency: CurrencyEnum.EUR, amount: 40 },
          { currency: CurrencyEnum.USD, amount: 120 },
        ],
      }),
    );

    expect(state).toEqual({
      mode: 'native-only',
      amount: null,
      currency: null,
      percentage: null,
      progressValue: null,
      progressMax: null,
      nativeSpent: [
        { currency: CurrencyEnum.EUR, amount: 40 },
        { currency: CurrencyEnum.USD, amount: 120 },
      ],
      isEstimated: false,
    });
  });

  it('sorts dashboard budgets by comparable percentage and keeps estimated rows comparable', () => {
    const items = getTopBudgetItems([
      makeBudget({
        id: 'native-only',
        categoryName: 'Trips',
        spent: null,
        currency: null,
        percentage: null,
        hasMixedSpend: true,
      }),
      makeBudget({ id: 'native', categoryName: 'Groceries', percentage: 24, spent: 120 }),
      makeBudget({
        id: 'estimated',
        categoryName: 'Travel',
        spent: null,
        currency: null,
        percentage: null,
        hasMixedSpend: true,
        estimatedSpent: 168,
        estimatedSpentCurrency: CurrencyEnum.USD,
        estimatedPercentage: 33.6,
      }),
    ]);

    expect(items.map((item) => item.id)).toEqual(['estimated', 'native', 'native-only']);

    expect(getBudgetDisplayState(items[0])).toEqual({
      mode: 'estimated',
      amount: 168,
      currency: CurrencyEnum.USD,
      percentage: 33.6,
      progressValue: 168,
      progressMax: 500,
      nativeSpent: [{ currency: CurrencyEnum.USD, amount: 120 }],
      isEstimated: true,
    });
  });
});
