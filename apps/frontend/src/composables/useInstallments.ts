import { ref, computed, type ComputedRef, type Ref } from 'vue';
import { trpc } from '@/api/trpc';
import type { InstallmentPlanDTO, InstallmentObligationDTO } from '@expenses/api';

type PlanResult = Awaited<ReturnType<typeof trpc.installment.getAllPlans.query>>;

interface InstallmentResult {
  /** Plans fetched directly from the installment API. */
  plans: Ref<PlanResult>;
  /** Total active plans count. */
  totalActivePlans: ComputedRef<number>;
  /** Total remaining debt across all active plans (sum of PENDING obligations). */
  totalRemaining: ComputedRef<number>;
  /** Loading state. */
  loading: ComputedRef<boolean>;
  /** Refetch plans from the API. */
  refetch: () => Promise<void>;
}

/**
 * Fetches installment plans with obligations from the dedicated
 * installment tRPC router. No transaction filtering or date heuristics.
 */
export function useInstallments(): InstallmentResult {
  const plans = ref<PlanResult>([] as unknown as PlanResult);
  const loading = ref(true);

  async function fetch() {
    loading.value = true;

    try {
      plans.value = await trpc.installment.getAllPlans.query({});
    } catch (err) {
      console.error('Failed to fetch installment plans:', err);
    } finally {
      loading.value = false;
    }
  }

  fetch();

  const totalActivePlans = computed(() => plans.value.length);

  const totalRemaining = computed(() =>
    plans.value.reduce((sum, plan) => {
      const pending = (plan.obligations ?? []).filter(
        (o: InstallmentObligationDTO) => o.status === 'PENDING',
      );
      return sum + pending.reduce((s, o: InstallmentObligationDTO) => s + Number(o.amount), 0);
    }, 0),
  );

  return {
    plans: computed(() => plans.value),
    totalActivePlans,
    totalRemaining,
    loading: computed(() => loading.value),
    refetch: fetch,
  };
}
