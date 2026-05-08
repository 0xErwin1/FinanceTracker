import type {
  FxRateDTO,
  UserValuationPreferencesDTO,
  ValuationCoverage,
  ValuationSnapshotDTO,
} from '@expenses/api';
import { CurrencyEnum } from '@expenses/api';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  FxRateDTO as AccountFxRateDTO,
  ValuationCoverage as AccountValuationCoverage,
  ValuationSnapshotDTO as AccountValuationSnapshotDTO,
} from '../../../../packages/api/src/types/account/model';
import type { UserValuationPreferencesDTO as ModelUserValuationPreferencesDTO } from '../../../../packages/api/src/types/user/model';

describe('client-safe multi-currency exports', () => {
  it('re-exports the frontend multi-currency DTOs and enums from @expenses/api', () => {
    expectTypeOf<FxRateDTO>().toEqualTypeOf<AccountFxRateDTO>();
    expectTypeOf<ValuationCoverage>().toEqualTypeOf<AccountValuationCoverage>();
    expectTypeOf<ValuationSnapshotDTO>().toEqualTypeOf<AccountValuationSnapshotDTO>();
    expectTypeOf<UserValuationPreferencesDTO>().toEqualTypeOf<ModelUserValuationPreferencesDTO>();

    expect(CurrencyEnum.USD).toBe('USD');
  });
});
