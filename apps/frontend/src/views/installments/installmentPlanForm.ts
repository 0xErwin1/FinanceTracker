import { CurrencyEnum } from '@expenses/api';

export interface InstallmentPlanDraft {
  totalAmount: string;
  currency: CurrencyEnum;
  accountId: string;
  installmentsCount: number;
  categoryId: string;
  note: string;
  startDate: string;
}

export interface LinkedAccountOption {
  id: string;
  name: string;
  archivedAt: string | null;
}

export function createInstallmentPlanDraft(
  today: string,
  defaultAccountId: string | null,
): InstallmentPlanDraft {
  return {
    totalAmount: '',
    currency: CurrencyEnum.USD,
    accountId: defaultAccountId ?? '',
    installmentsCount: 2,
    categoryId: '',
    note: '',
    startDate: today,
  };
}

export function reconcileInstallmentAccountSelection(
  currentAccountId: string,
  accounts: LinkedAccountOption[],
): string {
  if (accounts.some((account) => account.id === currentAccountId)) {
    return currentAccountId;
  }

  return accounts[0]?.id ?? '';
}

export function validateInstallmentPlanDraft(draft: InstallmentPlanDraft): string | null {
  const parsedAmount = Number(draft.totalAmount);

  if (!parsedAmount || parsedAmount <= 0) {
    return 'Amount must be greater than 0.';
  }

  if (!draft.accountId) {
    return 'Account is required.';
  }

  if (draft.installmentsCount < 2) {
    return 'Installment count must be at least 2.';
  }

  if (!draft.startDate) {
    return 'Start date is required.';
  }

  return null;
}

export function resolveLinkedAccountLabel(accountId: string | null, accounts: LinkedAccountOption[]): string {
  if (accountId === null) {
    return 'No account';
  }

  const account = accounts.find((item) => item.id === accountId);

  if (!account) {
    return 'Missing account';
  }

  if (account.archivedAt !== null) {
    return `${account.name} (archived)`;
  }

  return account.name;
}
