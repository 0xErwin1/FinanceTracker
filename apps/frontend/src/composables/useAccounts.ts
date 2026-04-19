import { computed, ref, type ComputedRef } from 'vue';
import { trpc } from '@/api/trpc';
import type { CurrencyEnum } from '@expenses/api';

type AccountsResult = Awaited<ReturnType<typeof trpc.account.getAll.query>>;
type AccountResult = AccountsResult[number];
type AccountSummaryResult = Awaited<ReturnType<typeof trpc.account.getSummaries.query>>;
type AccountSummaryItem = AccountSummaryResult[number];
type InstitutionResult = Awaited<ReturnType<typeof trpc.account.getInstitutions.query>>;

interface UseAccountsReturn {
  accounts: ComputedRef<AccountsResult>;
  activeAccounts: ComputedRef<AccountsResult>;
  summaries: ComputedRef<AccountSummaryResult>;
  institutions: ComputedRef<InstitutionResult>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<Error | null>;
  refetch: () => Promise<void>;
  accountsForCurrency: (currency: CurrencyEnum) => AccountResult[];
  postingAccountsForCurrency: (currency: CurrencyEnum) => AccountResult[];
  defaultAccountIdForCurrency: (currency: CurrencyEnum) => string | null;
  summaryForAccount: (accountId: string) => AccountSummaryItem | undefined;
}

const accounts = ref<AccountsResult>([]);
const summaries = ref<AccountSummaryResult>([]);
const institutions = ref<InstitutionResult>([]);
const loading = ref(false);
const error = ref<Error | null>(null);

let initialized = false;

async function fetchAccounts(): Promise<void> {
  loading.value = true;
  error.value = null;

  try {
    const [accountsResult, summariesResult, institutionsResult] = await Promise.all([
      trpc.account.getAll.query(),
      trpc.account.getSummaries.query(),
      trpc.account.getInstitutions.query(),
    ]);

    accounts.value = accountsResult;
    summaries.value = summariesResult;
    institutions.value = institutionsResult;
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(String(err));
  } finally {
    loading.value = false;
  }
}

function getAccountsForCurrency(currency: CurrencyEnum): AccountResult[] {
  return accounts.value.filter((account) => account.archivedAt === null && account.currency === currency);
}

function getPostingAccountsForCurrency(currency: CurrencyEnum): AccountResult[] {
  return getAccountsForCurrency(currency).filter((account) => account.ownership !== 'third_party');
}

function getDefaultAccountIdForCurrency(currency: CurrencyEnum): string | null {
  return getPostingAccountsForCurrency(currency)[0]?.id ?? null;
}

function getSummaryForAccount(accountId: string): AccountSummaryItem | undefined {
  return summaries.value.find((summary) => summary.accountId === accountId);
}

export function useAccounts(): UseAccountsReturn {
  if (!initialized) {
    initialized = true;
    void fetchAccounts();
  }

  return {
    accounts: computed(() => accounts.value),
    activeAccounts: computed(() => accounts.value.filter((account) => account.archivedAt === null)),
    summaries: computed(() => summaries.value),
    institutions: computed(() => institutions.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    refetch: fetchAccounts,
    accountsForCurrency: getAccountsForCurrency,
    postingAccountsForCurrency: getPostingAccountsForCurrency,
    defaultAccountIdForCurrency: getDefaultAccountIdForCurrency,
    summaryForAccount: getSummaryForAccount,
  };
}
