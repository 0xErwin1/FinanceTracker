import { CurrencyEnum } from '@expenses/api';
import { AppDataSource } from '../../src/data-source';
import { FxRate } from '../../src/entities';
import { valuationService } from '../../src/services/valuation.service';
import { seedUser, truncateAllTables } from './setup';

describe('valuation service', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('selects the latest manual rate on or before the valuation date', async () => {
    const user = await seedUser();
    const repo = AppDataSource.getRepository(FxRate);

    await repo.save(
      repo.create({
        userId: user.id,
        baseCurrency: CurrencyEnum.EUR,
        quoteCurrency: CurrencyEnum.USD,
        rate: 1.05,
        effectiveDate: '2026-04-10',
        sourceLabel: 'Older manual close',
      }),
    );

    await repo.save(
      repo.create({
        userId: user.id,
        baseCurrency: CurrencyEnum.EUR,
        quoteCurrency: CurrencyEnum.USD,
        rate: 1.08,
        effectiveDate: '2026-04-15',
        sourceLabel: 'Latest manual close',
      }),
    );

    const rate = await valuationService.getLatestRate({
      userId: user.id,
      baseCurrency: CurrencyEnum.EUR,
      quoteCurrency: CurrencyEnum.USD,
      valuationDate: '2026-04-18',
    });

    expect(rate).toMatchObject({
      baseCurrency: CurrencyEnum.EUR,
      quoteCurrency: CurrencyEnum.USD,
      rate: 1.08,
      effectiveDate: '2026-04-15',
      sourceLabel: 'Latest manual close',
    });
  });

  it('builds a stale partial valuation when one native balance lacks fresh coverage', async () => {
    const snapshot = valuationService.buildValuationSnapshot({
      nativeTotals: {
        EUR: 100,
        USD: 40,
      },
      reportingCurrency: CurrencyEnum.USD,
      valuationDate: '2026-04-18',
      freshnessDays: 3,
      rates: [
        {
          id: 'rate-1',
          userId: 'user-1',
          baseCurrency: CurrencyEnum.EUR,
          quoteCurrency: CurrencyEnum.USD,
          rate: 1.1,
          effectiveDate: '2026-04-10',
          sourceLabel: 'Manual close',
          createdAt: new Date('2026-04-10T00:00:00.000Z'),
        },
      ],
    });

    expect(snapshot).toEqual({
      reportingCurrency: CurrencyEnum.USD,
      valuationDate: '2026-04-18',
      coverage: 'stale',
      estimatedTotal: 150,
      nativeTotals: {
        EUR: 100,
        USD: 40,
      },
      coveredCurrencies: [CurrencyEnum.EUR, CurrencyEnum.USD],
      missingCurrencies: [],
      staleCurrencies: [CurrencyEnum.EUR],
      sourceLabels: ['Manual close'],
      effectiveDates: ['2026-04-10'],
    });
  });

  it('returns missing coverage without an estimated total when a required rate is unavailable', async () => {
    const snapshot = valuationService.buildValuationSnapshot({
      nativeTotals: {
        EUR: 100,
      },
      reportingCurrency: CurrencyEnum.USD,
      valuationDate: '2026-04-18',
      freshnessDays: 3,
      rates: [],
    });

    expect(snapshot).toEqual({
      reportingCurrency: CurrencyEnum.USD,
      valuationDate: '2026-04-18',
      coverage: 'missing',
      estimatedTotal: null,
      nativeTotals: {
        EUR: 100,
      },
      coveredCurrencies: [],
      missingCurrencies: [CurrencyEnum.EUR],
      staleCurrencies: [],
      sourceLabels: [],
      effectiveDates: [],
    });
  });
});
