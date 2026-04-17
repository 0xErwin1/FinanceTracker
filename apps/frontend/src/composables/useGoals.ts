import { type ComputedRef, computed, ref } from 'vue';
import { trpc } from '@/api/trpc';

type GoalResult = Awaited<ReturnType<typeof trpc.financialGoal.getAll.query>>;

interface UseGoalsReturn {
  goals: ComputedRef<GoalResult>;
  loading: ComputedRef<boolean>;
  error: ComputedRef<Error | null>;
  refetch: () => Promise<void>;
}

// Shared reactive state — all consumers share the same data.
const goals = ref<GoalResult>([] as unknown as GoalResult);
const loading = ref(true);
const error = ref<Error | null>(null);

let initialized = false;

async function fetch() {
  loading.value = true;
  error.value = null;

  try {
    goals.value = await trpc.financialGoal.getAll.query();
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(String(err));
  } finally {
    loading.value = false;
  }
}

/**
 * Composable that wraps tRPC financialGoal.getAll and provides
 * reactive state for financial goals. Uses shared singleton state
 * so all components see the same data and refetch() updates everywhere.
 */
export function useGoals(): UseGoalsReturn {
  if (!initialized) {
    initialized = true;
    fetch();
  }

  return {
    goals: computed(() => goals.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    refetch: fetch,
  };
}
