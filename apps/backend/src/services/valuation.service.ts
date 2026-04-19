import type { CurrencyEnum, FxRateDTO, ValuationSnapshotDTO } from '@expenses/api';
import { AppDataSource } from '../data-source';
import { FxRate } from '../entities';

interface GetLatestRateInput {
  userId: string;
  baseCurrency: CurrencyEnum;
  quoteCurrency: CurrencyEnum;
  valuationDate: string;
}

interface BuildValuationSnapshotInput {
  nativeTotals: Record<string, number>;
  reportingCurrency: CurrencyEnum;
  valuationDate: string;
  freshnessDays: number;
  rates: FxRateDTO[];
}

interface GetValuationSnapshotInput {
  userId: string;
  nativeTotals: Record<string, number>;
  reportingCurrency: CurrencyEnum;
  valuationDate: string;
  freshnessDays: number;
}

function differenceInDays(from: string, to: string): number {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);

  return Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
}

function dedupeSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function resolveCoverage(
  missingCurrencies: string[],
  staleCurrencies: string[],
  coveredCurrencies: string[],
): ValuationSnapshotDTO['coverage'] {
  if (coveredCurrencies.length === 0) {
    return 'missing';
  }

  if (missingCurrencies.length > 0 && coveredCurrencies.length > 0) {
    return 'partial';
  }

  if (missingCurrencies.length > 0) {
    return 'missing';
  }

  if (staleCurrencies.length > 0) {
    return 'stale';
  }

  return 'complete';
}

async function getLatestRate(input: GetLatestRateInput): Promise<FxRateDTO | null> {
  return AppDataSource.getRepository(FxRate)
    .createQueryBuilder('fxRate')
    .where('fxRate.userId = :userId', { userId: input.userId })
    .andWhere('fxRate.baseCurrency = :baseCurrency', { baseCurrency: input.baseCurrency })
    .andWhere('fxRate.quoteCurrency = :quoteCurrency', { quoteCurrency: input.quoteCurrency })
    .andWhere('fxRate.effectiveDate <= :valuationDate', { valuationDate: input.valuationDate })
    .orderBy('fxRate.effectiveDate', 'DESC')
    .addOrderBy('fxRate.createdAt', 'DESC')
    .getOne();
}

async function getValuationSnapshot(input: GetValuationSnapshotInput): Promise<ValuationSnapshotDTO> {
  const currencies = Object.entries(input.nativeTotals)
    .filter(([, amount]) => amount !== 0)
    .map(([currency]) => currency as CurrencyEnum)
    .filter((currency) => currency !== input.reportingCurrency);

  const rates = await Promise.all(
    currencies.map((baseCurrency) =>
      getLatestRate({
        userId: input.userId,
        baseCurrency,
        quoteCurrency: input.reportingCurrency,
        valuationDate: input.valuationDate,
      }),
    ),
  );

  return buildValuationSnapshot({
    nativeTotals: input.nativeTotals,
    reportingCurrency: input.reportingCurrency,
    valuationDate: input.valuationDate,
    freshnessDays: input.freshnessDays,
    rates: rates.filter((rate): rate is FxRateDTO => rate !== null),
  });
}

function buildValuationSnapshot(input: BuildValuationSnapshotInput): ValuationSnapshotDTO {
  const nativeTotals = Object.fromEntries(
    Object.entries(input.nativeTotals).filter(([, amount]) => amount !== 0),
  ) as Record<CurrencyEnum, number>;

  const coveredCurrencies = new Set<CurrencyEnum>();
  const missingCurrencies = new Set<CurrencyEnum>();
  const staleCurrencies = new Set<CurrencyEnum>();
  const sourceLabels = new Set<string>();
  const effectiveDates = new Set<string>();

  let estimatedTotal = 0;

  for (const [currency, amount] of Object.entries(nativeTotals) as Array<[CurrencyEnum, number]>) {
    if (currency === input.reportingCurrency) {
      coveredCurrencies.add(currency);
      estimatedTotal += amount;
      continue;
    }

    const rate = input.rates.find(
      (candidate) =>
        candidate.baseCurrency === currency &&
        candidate.quoteCurrency === input.reportingCurrency &&
        candidate.effectiveDate <= input.valuationDate,
    );

    if (!rate) {
      missingCurrencies.add(currency);
      continue;
    }

    coveredCurrencies.add(currency);
    sourceLabels.add(rate.sourceLabel);
    effectiveDates.add(rate.effectiveDate);
    estimatedTotal += amount * rate.rate;

    if (differenceInDays(rate.effectiveDate, input.valuationDate) > input.freshnessDays) {
      staleCurrencies.add(currency);
    }
  }

  const coverage = resolveCoverage([...missingCurrencies], [...staleCurrencies], [...coveredCurrencies]);

  return {
    reportingCurrency: input.reportingCurrency,
    valuationDate: input.valuationDate,
    coverage,
    estimatedTotal: coverage === 'missing' ? null : +estimatedTotal.toFixed(2),
    nativeTotals,
    coveredCurrencies: dedupeSorted([...coveredCurrencies]) as CurrencyEnum[],
    missingCurrencies: dedupeSorted([...missingCurrencies]) as CurrencyEnum[],
    staleCurrencies: dedupeSorted([...staleCurrencies]) as CurrencyEnum[],
    sourceLabels: dedupeSorted([...sourceLabels]),
    effectiveDates: dedupeSorted([...effectiveDates]),
  };
}

export const valuationService = {
  getLatestRate,
  getValuationSnapshot,
  buildValuationSnapshot,
};
