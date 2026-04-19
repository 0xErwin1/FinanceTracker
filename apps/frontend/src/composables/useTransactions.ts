import type { CurrencyEnum, TransactionType } from '@expenses/api';
import { computed, type Ref, ref } from 'vue';
import { trpc } from '@/api/trpc';

interface TransactionFilters {
  type?: TransactionType;
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
}

type TransactionResult = Awaited<ReturnType<typeof trpc.transaction.getAll.query>>;

interface UseTransactionsReturn {
  transactions: Ref<TransactionResult>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  refetch: () => Promise<void>;
  createTransfer: (input: {
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
    currency: CurrencyEnum;
    date: string;
    note?: string;
  }) => Promise<void>;
  updateTransfer: (input: {
    transactionId: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
    currency: CurrencyEnum;
    date: string;
    note?: string;
  }) => Promise<void>;
}

/**
 * Composable that wraps tRPC transaction.getAll and provides
 * reactive state for transactions with optional filtering.
 */
export function useTransactions(filters?: () => TransactionFilters): UseTransactionsReturn {
  const transactions = ref<TransactionResult>([] as unknown as TransactionResult);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  async function fetch() {
    loading.value = true;
    error.value = null;

    try {
      const input = filters?.() ?? {};
      transactions.value = await trpc.transaction.getAll.query(input);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      loading.value = false;
    }
  }

  async function createTransfer(input: {
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
    currency: CurrencyEnum;
    date: string;
    note?: string;
  }) {
    await trpc.transaction.createTransfer.mutate(input);
    await fetch();
  }

  async function updateTransfer(input: {
    transactionId: string;
    sourceAccountId: string;
    destinationAccountId: string;
    amount: number;
    currency: CurrencyEnum;
    date: string;
    note?: string;
  }) {
    await trpc.transaction.updateTransfer.mutate(input);
    await fetch();
  }

  fetch();

  return {
    transactions: computed(() => transactions.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    refetch: fetch,
    createTransfer,
    updateTransfer,
  };
}
