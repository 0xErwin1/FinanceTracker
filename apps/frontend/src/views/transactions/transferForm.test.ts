import { CurrencyEnum, type AccountDTO, type AccountOwnership } from '@expenses/api';
import { describe, expect, it } from 'vitest';
import { getTransferConstraintMessage, resolveTransferAccountOptions } from './transferForm';

function makeAccount(overrides: Partial<AccountDTO> = {}): AccountDTO {
  return {
    id: overrides.id ?? 'account-1',
    userId: overrides.userId ?? 'user-1',
    name: overrides.name ?? 'Imported USD',
    currency: overrides.currency ?? CurrencyEnum.USD,
    kind: overrides.kind ?? 'checking',
    ownership: overrides.ownership ?? ('self' satisfies AccountOwnership),
    institutionId: overrides.institutionId ?? null,
    importSource: overrides.importSource ?? null,
    externalReference: overrides.externalReference ?? null,
    archivedAt: overrides.archivedAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-04-18T00:00:00.000Z'),
    institution: overrides.institution ?? null,
  };
}

describe('transfer form helpers', () => {
  it('replaces the unusable transfer form with create-first guidance when only one source account exists', () => {
    const options = resolveTransferAccountOptions(
      [makeAccount({ id: 'imported-usd', name: 'Imported USD', ownership: 'self' })],
      CurrencyEnum.USD,
    );

    expect(options.selectedSourceAccountId).toBe('imported-usd');
    expect(options.sourceAccounts.map((account) => account.id)).toEqual(['imported-usd']);
    expect(options.destinationAccounts).toEqual([]);
    expect(getTransferConstraintMessage(options, CurrencyEnum.USD)).toBe(
      'Transfers from Imported USD need another USD destination. Add a self, custodial, or third-party USD account first.',
    );
  });

  it('allows self accounts to transfer into third-party destinations while keeping third-party accounts out of source options', () => {
    const options = resolveTransferAccountOptions(
      [
        makeAccount({ id: 'wallet', name: 'Wallet', ownership: 'self' }),
        makeAccount({ id: 'landlord', name: 'Landlord', ownership: 'third_party' }),
        makeAccount({ id: 'brokerage', name: 'Brokerage cash', ownership: 'custodial' }),
      ],
      CurrencyEnum.USD,
      'wallet',
    );

    expect(options.sourceAccounts.map((account) => account.id)).toEqual(['wallet', 'brokerage']);
    expect(options.destinationAccounts.map((account) => account.id)).toEqual(['landlord', 'brokerage']);
    expect(getTransferConstraintMessage(options, CurrencyEnum.USD)).toBeNull();
  });
});
