import { type AccountDTO, CurrencyEnum, type InstitutionDTO } from '@expenses/api';
import { describe, expect, it } from 'vitest';
import {
  buildAccountDeletionState,
  buildBankingSuccessToast,
  buildInstitutionDeletionState,
  buildInstitutionRows,
  createAccountDraft,
  createInstitutionDraft,
  createInstitutionSelectLabel,
  describeAccountOwnership,
  formatAccountOwnership,
  populateAccountDraft,
  resolveCardScopedPanelLayout,
  populateInstitutionDraft,
  validateAccountDraft,
  validateInstitutionDraft,
} from './bankingManagement';

function makeInstitution(overrides: Partial<InstitutionDTO> = {}): InstitutionDTO {
  return {
    id: overrides.id ?? 'institution-1',
    name: overrides.name ?? 'Vault Bank',
    code: overrides.code ?? 'VB',
    createdAt: overrides.createdAt ?? new Date('2026-04-18T00:00:00.000Z'),
  };
}

function makeAccount(overrides: Partial<AccountDTO> = {}): AccountDTO {
  const institution = overrides.institution === undefined ? makeInstitution() : overrides.institution;

  return {
    id: overrides.id ?? 'account-1',
    userId: overrides.userId ?? 'user-1',
    name: overrides.name ?? 'Main checking',
    currency: overrides.currency ?? CurrencyEnum.USD,
    kind: overrides.kind ?? 'checking',
    ownership: overrides.ownership ?? 'self',
    institutionId: overrides.institutionId ?? institution?.id ?? null,
    importSource: overrides.importSource ?? null,
    externalReference: overrides.externalReference ?? null,
    archivedAt: overrides.archivedAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-04-18T00:00:00.000Z'),
    institution,
  };
}

describe('banking management helpers', () => {
  it('creates drafts with banking defaults for account and institution forms', () => {
    expect(createAccountDraft()).toEqual({
      name: '',
      currency: CurrencyEnum.USD,
      kind: 'checking',
      ownership: 'self',
      institutionId: '',
    });

    expect(createInstitutionDraft()).toEqual({
      name: '',
      code: '',
    });
  });

  it('validates account drafts and rejects blank names', () => {
    expect(
      validateAccountDraft({
        name: '  ',
        currency: CurrencyEnum.USD,
        kind: 'checking',
        ownership: 'self',
        institutionId: '',
      }),
    ).toBe('Account name is required.');

    expect(
      validateAccountDraft({
        name: 'Primary checking',
        currency: CurrencyEnum.EUR,
        kind: 'savings',
        ownership: 'custodial',
        institutionId: 'institution-1',
      }),
    ).toBeNull();
  });

  it('validates institution drafts and normalizes institution codes', () => {
    expect(
      validateInstitutionDraft({
        name: '   ',
        code: '',
      }),
    ).toBe('Institution name is required.');

    expect(
      validateInstitutionDraft({
        name: 'Neighborhood credit union',
        code: ' vcu ',
      }),
    ).toBeNull();

    expect(
      populateInstitutionDraft(
        makeInstitution({
          id: 'institution-2',
          name: 'Neighborhood credit union',
          code: 'VCU',
        }),
      ),
    ).toEqual({
      name: 'Neighborhood credit union',
      code: 'VCU',
    });
  });

  it('builds institution usage rows with active and archived account counts', () => {
    const firstInstitution = makeInstitution({ id: 'institution-1', name: 'Vault Bank', code: 'VB' });
    const secondInstitution = makeInstitution({ id: 'institution-2', name: 'Cash House', code: null });

    const rows = buildInstitutionRows(
      [firstInstitution, secondInstitution],
      [
        makeAccount({ id: 'account-1', institution: firstInstitution, institutionId: firstInstitution.id }),
        makeAccount({
          id: 'account-2',
          name: 'Legacy cash',
          archivedAt: new Date('2026-04-01T00:00:00.000Z'),
          institution: firstInstitution,
          institutionId: firstInstitution.id,
        }),
        makeAccount({
          id: 'account-3',
          name: 'Travel cash',
          currency: CurrencyEnum.EUR,
          institution: secondInstitution,
          institutionId: secondInstitution.id,
        }),
      ],
    );

    expect(rows).toEqual([
      {
        institution: firstInstitution,
        linkedAccounts: 2,
        activeAccounts: 1,
        archivedAccounts: 1,
        currencies: ['USD'],
      },
      {
        institution: secondInstitution,
        linkedAccounts: 1,
        activeAccounts: 1,
        archivedAccounts: 0,
        currencies: ['EUR'],
      },
    ]);

    expect(buildInstitutionDeletionState(rows[0])).toEqual({
      canDelete: false,
      title: 'Institution still in use',
      description:
        'Vault Bank is still linked to 2 accounts. Reassign or remove the institution from those accounts before deleting it.',
      confirmLabel: 'Delete institution',
    });

    expect(buildInstitutionDeletionState(rows[1])).toEqual({
      canDelete: false,
      title: 'Institution still in use',
      description:
        'Cash House is still linked to 1 account. Reassign or remove the institution from those accounts before deleting it.',
      confirmLabel: 'Delete institution',
    });
  });

  it('marks unused institutions as safe to delete', () => {
    const institution = makeInstitution({ id: 'institution-3', name: 'Spare Bank', code: 'SPARE' });
    const rows = buildInstitutionRows([institution], []);

    expect(buildInstitutionDeletionState(rows[0])).toEqual({
      canDelete: true,
      title: 'Delete institution?',
      description:
        'Spare Bank is not linked to any accounts. Deleting it removes the reusable institution record permanently.',
      confirmLabel: 'Delete institution',
    });
  });

  it('builds a permanent-delete confirmation for an unused account', () => {
    const account = makeAccount({
      id: 'account-delete-ok',
      name: 'Temporary wallet',
      archivedAt: new Date('2026-04-18T00:00:00.000Z'),
    });

    expect(
      buildAccountDeletionState(account, {
        accountId: account.id,
        canDelete: true,
        blockers: {
          linkedTransactions: 0,
          transferReferences: 0,
          recurringTemplates: 0,
          installmentPlans: 0,
        },
        message: 'This account is unused and can be deleted permanently.',
      }),
    ).toEqual({
      canDelete: true,
      title: 'Delete account?',
      description:
        'Temporary wallet is unused. Deleting it permanently removes the account record because no transactions, transfer links, recurring templates, or installment plans still depend on it.',
      confirmLabel: 'Delete account',
      archiveInsteadLabel: null,
      blockerSummary: [],
    });
  });

  it('builds actionable blocked-delete copy when an account is still referenced', () => {
    const account = makeAccount({
      id: 'account-delete-blocked',
      name: 'Main checking',
      archivedAt: null,
    });

    expect(
      buildAccountDeletionState(account, {
        accountId: account.id,
        canDelete: false,
        blockers: {
          linkedTransactions: 2,
          transferReferences: 1,
          recurringTemplates: 1,
          installmentPlans: 3,
        },
        message:
          'This account cannot be deleted because it is still referenced by 2 transactions, 1 transfer link, 1 recurring template, and 3 installment plans. Keep it archived instead of deleting it.',
      }),
    ).toEqual({
      canDelete: false,
      title: 'Account still in use',
      description:
        'Main checking cannot be deleted yet. Remove or reassign every linked record first, then retry deletion.',
      confirmLabel: 'Delete account',
      archiveInsteadLabel: 'Archive instead',
      blockerSummary: [
        '2 linked transactions',
        '1 transfer reference',
        '1 recurring template',
        '3 installment plans',
      ],
    });
  });

  it('prefers card-local height when a destructive review panel expands inline', () => {
    expect(resolveCardScopedPanelLayout(true)).toEqual({
      preserveNeighborHeight: true,
    });

    expect(resolveCardScopedPanelLayout(false)).toEqual({
      preserveNeighborHeight: false,
    });
  });

  it('populates drafts and select labels from the saved account metadata', () => {
    const institution = makeInstitution({ id: 'institution-9', name: 'Northern Bank' });
    const account = makeAccount({
      id: 'account-9',
      name: 'Rainy day savings',
      currency: CurrencyEnum.UYU,
      kind: 'savings',
      ownership: 'self',
      institutionId: institution.id,
      institution,
    });

    expect(populateAccountDraft(account)).toEqual({
      name: 'Rainy day savings',
      currency: CurrencyEnum.UYU,
      kind: 'savings',
      ownership: 'self',
      institutionId: institution.id,
    });

    expect(createInstitutionSelectLabel(account)).toBe('Northern Bank');
    expect(createInstitutionSelectLabel(makeAccount({ institution: null, institutionId: null }))).toBe(
      'No institution',
    );
  });

  it('formats ownership labels and explanations for final banking copy', () => {
    expect(formatAccountOwnership('self')).toBe('My account');
    expect(formatAccountOwnership('custodial')).toBe('Custodial');
    expect(formatAccountOwnership('third_party')).toBe('Third-party destination');

    expect(describeAccountOwnership('self')).toBe(
      'Use for accounts you personally own. These balances count as your money and can fund normal transactions.',
    );
    expect(describeAccountOwnership('custodial')).toBe(
      'Use for money still owned by you but held by another party, such as a broker, wallet provider, or escrow.',
    );
    expect(describeAccountOwnership('third_party')).toBe(
      'Use for payees or recipients like a landlord. These accounts stay out of your money totals and work as transfer destinations.',
    );
  });

  it('builds success toast copy for account lifecycle actions', () => {
    expect(buildBankingSuccessToast('account', 'Savings vault', 'created')).toEqual({
      title: 'Account created',
      description: 'Savings vault is ready for new transactions, transfers, and scheduled payments.',
    });

    expect(buildBankingSuccessToast('account', 'Daily spending', 'archived')).toEqual({
      title: 'Account archived',
      description: 'Daily spending stays visible in history but is no longer available for new transactions.',
    });
  });

  it('builds success toast copy for institution lifecycle actions', () => {
    expect(buildBankingSuccessToast('institution', 'Vault Bank', 'created')).toEqual({
      title: 'Institution created',
      description: 'Vault Bank can now be reused across your banking accounts.',
    });

    expect(buildBankingSuccessToast('institution', 'Vault Bank', 'deleted')).toEqual({
      title: 'Institution deleted',
      description: 'Vault Bank was permanently removed from your reusable institution list.',
    });
  });
});
