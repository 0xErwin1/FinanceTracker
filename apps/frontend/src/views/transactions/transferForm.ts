import type { AccountDTO, CurrencyEnum } from '@expenses/api';

type TransferAccount = Omit<Pick<AccountDTO, 'id' | 'name' | 'currency' | 'ownership'>, never> & {
  archivedAt: string | Date | null;
};

export interface TransferAccountOptions {
  sourceAccounts: TransferAccount[];
  destinationAccounts: TransferAccount[];
  selectedSourceAccountId: string;
}

function isActiveCurrencyAccount(account: TransferAccount, currency: CurrencyEnum): boolean {
  return account.archivedAt === null && account.currency === currency;
}

function canFundTransfer(account: TransferAccount): boolean {
  return account.ownership !== 'third_party';
}

export function resolveTransferAccountOptions(
  accounts: TransferAccount[],
  currency: CurrencyEnum,
  selectedSourceAccountId?: string,
): TransferAccountOptions {
  const activeCurrencyAccounts = accounts.filter((account) => isActiveCurrencyAccount(account, currency));
  const sourceAccounts = activeCurrencyAccounts.filter(canFundTransfer);

  const selectedSource = sourceAccounts.find((account) => account.id === selectedSourceAccountId);
  const resolvedSourceAccountId = selectedSource?.id ?? sourceAccounts[0]?.id ?? '';

  const destinationAccounts = activeCurrencyAccounts.filter(
    (account) => account.id !== resolvedSourceAccountId,
  );

  return {
    sourceAccounts,
    destinationAccounts,
    selectedSourceAccountId: resolvedSourceAccountId,
  };
}

export function getTransferConstraintMessage(
  options: TransferAccountOptions,
  currency: CurrencyEnum,
): string | null {
  if (options.sourceAccounts.length === 0) {
    return `No active ${currency} source accounts are available. Add or unarchive a self or custodial ${currency} account first.`;
  }

  if (options.destinationAccounts.length === 0) {
    const sourceName = options.sourceAccounts.find(
      (account) => account.id === options.selectedSourceAccountId,
    )?.name;

    return `Transfers from ${sourceName ?? currency} need another ${currency} destination. Add a self, custodial, or third-party ${currency} account first.`;
  }

  return null;
}
