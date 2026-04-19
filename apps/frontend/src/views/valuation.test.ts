import { CurrencyEnum, type ValuationSnapshotDTO } from '@expenses/api';
import { describe, expect, it } from 'vitest';
import { getValuationCoverageMessage, getValuationSummaryLabel } from './valuation';

function makeSnapshot(overrides: Partial<ValuationSnapshotDTO> = {}): ValuationSnapshotDTO {
  return {
    reportingCurrency: overrides.reportingCurrency ?? CurrencyEnum.USD,
    valuationDate: overrides.valuationDate ?? '2026-04-19',
    coverage: overrides.coverage ?? 'complete',
    estimatedTotal: overrides.estimatedTotal ?? 123.45,
    nativeTotals: overrides.nativeTotals ?? { USD: 50, EUR: 60, UYU: 0 },
    coveredCurrencies: overrides.coveredCurrencies ?? [CurrencyEnum.USD, CurrencyEnum.EUR],
    missingCurrencies: overrides.missingCurrencies ?? [],
    staleCurrencies: overrides.staleCurrencies ?? [],
    sourceLabels: overrides.sourceLabels ?? ['Manual close'],
    effectiveDates: overrides.effectiveDates ?? ['2026-04-18'],
  };
}

describe('valuation presentation helpers', () => {
  it('describes complete estimated coverage with provenance', () => {
    const snapshot = makeSnapshot();

    expect(getValuationSummaryLabel(snapshot)).toBe('Estimated total in USD');
    expect(getValuationCoverageMessage(snapshot)).toBe(
      'Manual close rates from 2026-04-18 support this estimate.',
    );
  });

  it('explains stale coverage without hiding the estimate', () => {
    const snapshot = makeSnapshot({ coverage: 'stale', staleCurrencies: [CurrencyEnum.EUR] });

    expect(getValuationCoverageMessage(snapshot)).toBe(
      'Estimated coverage is stale for EUR. Check newer manual rates before relying on this total.',
    );
  });

  it('explains partial coverage when some native currencies are still missing', () => {
    const snapshot = makeSnapshot({
      coverage: 'partial',
      missingCurrencies: [CurrencyEnum.UYU],
      coveredCurrencies: [CurrencyEnum.USD],
      nativeTotals: { USD: 50, EUR: 0, UYU: 1000 },
    });

    expect(getValuationCoverageMessage(snapshot)).toBe(
      'Estimated coverage is partial. Missing rates for UYU keep part of the total in native balances only.',
    );
  });

  it('explains missing coverage when no estimate can be shown', () => {
    const snapshot = makeSnapshot({
      coverage: 'missing',
      estimatedTotal: null,
      missingCurrencies: [CurrencyEnum.EUR],
      coveredCurrencies: [],
    });

    expect(getValuationCoverageMessage(snapshot)).toBe(
      'Estimated total unavailable. Add manual FX rates for EUR to keep native balances honest.',
    );
  });
});
