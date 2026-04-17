import { ref, computed, type Ref } from 'vue';
import { trpc } from '@/api/trpc';
import type { TransactionType } from '@expenses/api';

interface TransactionFilters {
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
}

type TransactionResult = Awaited<ReturnType<typeof trpc.transaction.getAll.query>>;

interface UseTransactionsReturn {
  transactions: Ref<TransactionResult>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  refetch: () => Promise<void>;
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

  fetch();

  return {
    transactions: computed(() => transactions.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    refetch: fetch,
  };
}
