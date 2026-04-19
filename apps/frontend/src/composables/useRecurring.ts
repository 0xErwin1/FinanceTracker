import { computed, type Ref, ref } from 'vue';
import { trpc } from '@/api/trpc';
import { useAccounts } from './useAccounts';

type RecurringResult = Awaited<ReturnType<typeof trpc.recurring.getAll.query>>;

interface UseRecurringReturn {
  recurring: Ref<RecurringResult>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  refetch: () => Promise<void>;
  activeAccounts: ReturnType<typeof useAccounts>['activeAccounts'];
}

/**
 * Composable that wraps tRPC recurring.getAll and provides
 * reactive state for recurring transactions.
 */
export function useRecurring(filters?: () => { active?: boolean }): UseRecurringReturn {
  const { activeAccounts } = useAccounts();
  const recurring = ref<RecurringResult>([] as unknown as RecurringResult);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  async function fetch() {
    loading.value = true;
    error.value = null;

    try {
      const input = filters?.() ?? {};
      recurring.value = await trpc.recurring.getAll.query(input);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      loading.value = false;
    }
  }

  fetch();

  return {
    recurring: computed(() => recurring.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    refetch: fetch,
    activeAccounts,
  };
}
