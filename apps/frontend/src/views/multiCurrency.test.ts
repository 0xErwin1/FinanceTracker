import { describe, expect, it } from 'vitest';
import {
  buildBudgetTotalsByCurrency,
  buildTransactionGroupSummary,
  summarizeCurrencyMap,
} from './multiCurrency';

describe('multi-currency presentation helpers', () => {
  it('sorts native currency maps and flags mixed-currency summaries', () => {
    expect(summarizeCurrencyMap({ EUR: 5, USD: 10 })).toEqual({
      hasMultipleCurrencies: true,
      entries: [
        { currency: 'EUR', amount: 5 },
        { currency: 'USD', amount: 10 },
      ],
    });
  });

  it('builds budget subtotals per currency instead of one mixed total', () => {
    const totals = buildBudgetTotalsByCurrency([
      { currency: 'USD', budgeted: 400, spent: 125 },
      { currency: 'EUR', budgeted: 300, spent: 80 },
      { currency: 'USD', budgeted: 50, spent: 25 },
    ]);

    expect(totals).toEqual({
      hasMultipleCurrencies: true,
      budgeted: [
        { currency: 'EUR', amount: 300 },
        { currency: 'USD', amount: 450 },
      ],
      spent: [
        { currency: 'EUR', amount: 80 },
        { currency: 'USD', amount: 150 },
      ],
    });
  });

  it('returns per-currency daily ledger totals when a day mixes currencies', () => {
    const summary = buildTransactionGroupSummary([
      { type: 'INCOME', amount: 100, currency: 'USD' },
      { type: 'EXPENSE', amount: 25, currency: 'USD' },
      { type: 'EXPENSE', amount: 10, currency: 'EUR' },
    ]);

    expect(summary).toEqual({
      combinedTotal: null,
      currencyTotals: [
        { currency: 'EUR', amount: -10 },
        { currency: 'USD', amount: 75 },
      ],
      hasMultipleCurrencies: true,
    });
  });

  it('keeps single-currency daily totals available for legacy headers', () => {
    const summary = buildTransactionGroupSummary([
      { type: 'INCOME', amount: 100, currency: 'USD' },
      { type: 'EXPENSE', amount: 40, currency: 'USD' },
    ]);

    expect(summary).toEqual({
      combinedTotal: { amount: 60, currency: 'USD' },
      currencyTotals: [{ currency: 'USD', amount: 60 }],
      hasMultipleCurrencies: false,
    });
  });
});
