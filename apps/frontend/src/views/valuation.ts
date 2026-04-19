import type { ValuationSnapshotDTO } from '@expenses/api';

function listCurrencies(currencies: string[]): string {
  return currencies.join(', ');
}

export function getValuationSummaryLabel(snapshot: ValuationSnapshotDTO | null): string {
  if (!snapshot || snapshot.estimatedTotal === null) {
    return 'Native totals only';
  }

  return `Estimated total in ${snapshot.reportingCurrency}`;
}

export function getValuationCoverageMessage(snapshot: ValuationSnapshotDTO | null): string {
  if (!snapshot) {
    return 'Set a reporting currency and manual FX rates to unlock estimated totals.';
  }

  if (snapshot.coverage === 'missing') {
    return `Estimated total unavailable. Add manual FX rates for ${listCurrencies(snapshot.missingCurrencies)} to keep native balances honest.`;
  }

  if (snapshot.coverage === 'partial') {
    return `Estimated coverage is partial. Missing rates for ${listCurrencies(snapshot.missingCurrencies)} keep part of the total in native balances only.`;
  }

  if (snapshot.coverage === 'stale') {
    return `Estimated coverage is stale for ${listCurrencies(snapshot.staleCurrencies)}. Check newer manual rates before relying on this total.`;
  }

  return `${snapshot.sourceLabels.join(', ')} rates from ${snapshot.effectiveDates.at(-1)} support this estimate.`;
}
