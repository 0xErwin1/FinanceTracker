import { ref, computed, type Ref } from 'vue';
import { trpc } from '@/api/trpc';

type BudgetResult = Awaited<ReturnType<typeof trpc.budget.getAll.query>>;
type AlertResult = Awaited<ReturnType<typeof trpc.budget.getAlerts.query>>;

interface UseBudgetsReturn {
  budgets: Ref<BudgetResult>;
  alerts: Ref<AlertResult>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  refetch: () => Promise<void>;
}

/**
 * Composable that wraps tRPC budget.getAll and budget.getAlerts
 * and provides reactive state for budgets and alerts.
 */
export function useBudgets(month?: () => string): UseBudgetsReturn {
  const budgets = ref<BudgetResult>([] as unknown as BudgetResult);
  const alerts = ref<AlertResult>([] as unknown as AlertResult);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  async function fetch() {
    loading.value = true;
    error.value = null;

    try {
      const raw = month?.() ?? new Date().toISOString().slice(0, 7);
      const monthInput = raw.length === 7 ? `${raw}-01` : raw;

      const [budgetsResult, alertsResult] = await Promise.all([
        trpc.budget.getAll.query({ month: monthInput }),
        trpc.budget.getAlerts.query({ month: monthInput }),
      ]);

      budgets.value = budgetsResult;
      alerts.value = alertsResult;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      loading.value = false;
    }
  }

  fetch();

  return {
    budgets: computed(() => budgets.value),
    alerts: computed(() => alerts.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    refetch: fetch,
  };
}
