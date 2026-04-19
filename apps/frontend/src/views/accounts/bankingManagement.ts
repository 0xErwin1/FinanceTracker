import { type AccountKind, type AccountOwnership, CurrencyEnum } from '@expenses/api';

export interface InstitutionLike {
  id: string;
  name: string;
  code: string | null;
  createdAt: string | Date;
}

export interface AccountLike {
  id: string;
  name: string;
  currency: CurrencyEnum;
  kind: AccountKind;
  ownership: AccountOwnership;
  institutionId: string | null;
  archivedAt: string | Date | null;
  institution?: InstitutionLike | null;
}

export interface AccountDraft {
  name: string;
  currency: CurrencyEnum;
  kind: AccountKind;
  ownership: AccountOwnership;
  institutionId: string;
}

export interface InstitutionDraft {
  name: string;
  code: string;
}

export interface InstitutionRow {
  institution: InstitutionLike;
  linkedAccounts: number;
  activeAccounts: number;
  archivedAccounts: number;
  currencies: CurrencyEnum[];
}

export interface InstitutionDeletionState {
  canDelete: boolean;
  title: string;
  description: string;
  confirmLabel: string;
}

export interface AccountDeletionCheck {
  accountId: string;
  canDelete: boolean;
  blockers: {
    linkedTransactions: number;
    transferReferences: number;
    recurringTemplates: number;
    installmentPlans: number;
  };
  message: string;
}

export interface AccountDeletionState {
  canDelete: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  archiveInsteadLabel: string | null;
  blockerSummary: string[];
}

export interface CardScopedPanelLayout {
  preserveNeighborHeight: boolean;
}

export type BankingToastEntity = 'account' | 'institution';
export type BankingToastAction = 'created' | 'updated' | 'archived' | 'deleted';

export interface BankingSuccessToast {
  title: string;
  description: string;
}

function formatDeletionBlocker(count: number, singular: string, plural: string): string | null {
  if (count === 0) {
    return null;
  }

  return `${count} ${count === 1 ? singular : plural}`;
}

export function createAccountDraft(): AccountDraft {
  return {
    name: '',
    currency: CurrencyEnum.USD,
    kind: 'checking',
    ownership: 'self',
    institutionId: '',
  };
}

export function populateAccountDraft(account: AccountLike): AccountDraft {
  return {
    name: account.name,
    currency: account.currency,
    kind: account.kind,
    ownership: account.ownership,
    institutionId: account.institutionId ?? '',
  };
}

export function validateAccountDraft(draft: AccountDraft): string | null {
  if (!draft.name.trim()) {
    return 'Account name is required.';
  }

  return null;
}

export function createInstitutionDraft(): InstitutionDraft {
  return {
    name: '',
    code: '',
  };
}

export function populateInstitutionDraft(institution: InstitutionLike): InstitutionDraft {
  return {
    name: institution.name,
    code: institution.code ?? '',
  };
}

export function validateInstitutionDraft(draft: InstitutionDraft): string | null {
  if (!draft.name.trim()) {
    return 'Institution name is required.';
  }

  return null;
}

export function normalizeInstitutionCode(code: string): string | undefined {
  const normalized = code.trim().toUpperCase();

  return normalized.length > 0 ? normalized : undefined;
}

export function buildInstitutionRows(
  institutions: InstitutionLike[],
  accounts: AccountLike[],
): InstitutionRow[] {
  return institutions.map((institution) => {
    const linkedAccounts = accounts.filter((account) => account.institutionId === institution.id);
    const currencies = [...new Set(linkedAccounts.map((account) => account.currency))].sort();

    return {
      institution,
      linkedAccounts: linkedAccounts.length,
      activeAccounts: linkedAccounts.filter((account) => account.archivedAt === null).length,
      archivedAccounts: linkedAccounts.filter((account) => account.archivedAt !== null).length,
      currencies,
    };
  });
}

export function createInstitutionSelectLabel(account: Pick<AccountLike, 'institution'>): string {
  return account.institution?.name ?? 'No institution';
}

export function buildInstitutionDeletionState(row: InstitutionRow): InstitutionDeletionState {
  if (row.linkedAccounts > 0) {
    const accountLabel = row.linkedAccounts === 1 ? 'account' : 'accounts';

    return {
      canDelete: false,
      title: 'Institution still in use',
      description: `${row.institution.name} is still linked to ${row.linkedAccounts} ${accountLabel}. Reassign or remove the institution from those accounts before deleting it.`,
      confirmLabel: 'Delete institution',
    };
  }

  return {
    canDelete: true,
    title: 'Delete institution?',
    description: `${row.institution.name} is not linked to any accounts. Deleting it removes the reusable institution record permanently.`,
    confirmLabel: 'Delete institution',
  };
}

export function buildAccountDeletionState(
  account: Pick<AccountLike, 'name' | 'archivedAt'>,
  deletionCheck: AccountDeletionCheck,
): AccountDeletionState {
  if (deletionCheck.canDelete) {
    return {
      canDelete: true,
      title: 'Delete account?',
      description: `${account.name} is unused. Deleting it permanently removes the account record because no transactions, transfer links, recurring templates, or installment plans still depend on it.`,
      confirmLabel: 'Delete account',
      archiveInsteadLabel: null,
      blockerSummary: [],
    };
  }

  return {
    canDelete: false,
    title: 'Account still in use',
    description: `${account.name} cannot be deleted yet. Remove or reassign every linked record first, then retry deletion.`,
    confirmLabel: 'Delete account',
    archiveInsteadLabel: account.archivedAt === null ? 'Archive instead' : null,
    blockerSummary: [
      formatDeletionBlocker(
        deletionCheck.blockers.linkedTransactions,
        'linked transaction',
        'linked transactions',
      ),
      formatDeletionBlocker(
        deletionCheck.blockers.transferReferences,
        'transfer reference',
        'transfer references',
      ),
      formatDeletionBlocker(
        deletionCheck.blockers.recurringTemplates,
        'recurring template',
        'recurring templates',
      ),
      formatDeletionBlocker(deletionCheck.blockers.installmentPlans, 'installment plan', 'installment plans'),
    ].filter((entry): entry is string => entry !== null),
  };
}

export function resolveCardScopedPanelLayout(hasInlineReviewPanel: boolean): CardScopedPanelLayout {
  return {
    preserveNeighborHeight: hasInlineReviewPanel,
  };
}

export function buildBankingSuccessToast(
  entity: BankingToastEntity,
  name: string,
  action: BankingToastAction,
): BankingSuccessToast {
  if (entity === 'account') {
    switch (action) {
      case 'created':
        return {
          title: 'Account created',
          description: `${name} is ready for new transactions, transfers, and scheduled payments.`,
        };
      case 'updated':
        return {
          title: 'Account updated',
          description: `Saved the latest banking details for ${name}.`,
        };
      case 'archived':
        return {
          title: 'Account archived',
          description: `${name} stays visible in history but is no longer available for new transactions.`,
        };
      case 'deleted':
        return {
          title: 'Account deleted',
          description: `${name} was permanently removed because nothing still depends on it.`,
        };
    }
  }

  switch (action) {
    case 'created':
      return {
        title: 'Institution created',
        description: `${name} can now be reused across your banking accounts.`,
      };
    case 'updated':
      return {
        title: 'Institution updated',
        description: `Saved the latest institution details for ${name}.`,
      };
    case 'archived':
      return {
        title: 'Institution updated',
        description: `Saved the latest institution details for ${name}.`,
      };
    case 'deleted':
      return {
        title: 'Institution deleted',
        description: `${name} was permanently removed from your reusable institution list.`,
      };
  }
}

export function formatAccountOwnership(ownership: AccountOwnership): string {
  switch (ownership) {
    case 'self':
      return 'My account';
    case 'custodial':
      return 'Custodial';
    case 'third_party':
      return 'Third-party destination';
  }
}

export function describeAccountOwnership(ownership: AccountOwnership): string {
  switch (ownership) {
    case 'self':
      return 'Use for accounts you personally own. These balances count as your money and can fund normal transactions.';
    case 'custodial':
      return 'Use for money still owned by you but held by another party, such as a broker, wallet provider, or escrow.';
    case 'third_party':
      return 'Use for payees or recipients like a landlord. These accounts stay out of your money totals and work as transfer destinations.';
  }
}
