import { computed, type ComputedRef, type Ref } from 'vue';
import type { trpc } from '@/api/trpc';
import type { InstallmentPlan } from '@/types';
import { groupBy } from '@/utils/groupBy';

type TransactionItem = Awaited<ReturnType<typeof trpc.transaction.getAll.query>>[number];

interface InstallmentResult {
  /** Grouped installment plans. */
  plans: ComputedRef<InstallmentPlan[]>;
  /** Total active plans count. */
  totalActivePlans: ComputedRef<number>;
  /** Total remaining debt across all plans. */
  totalRemaining: ComputedRef<number>;
}

/**
 * Groups transactions by installmentPlanId and computes
 * progress per plan (paid/total) and timeline entries.
 * Takes a reactive transactions array as input.
 */
export function useInstallments(transactions: Ref<TransactionItem[]>): InstallmentResult {
  const plans = computed<InstallmentPlan[]>(() => {
    const installments = transactions.value.filter((t) => t.type === 'INSTALLMENTS' && t.installmentPlanId);

    const grouped = groupBy(installments, (t) => t.installmentPlanId as string);

    return Object.entries(grouped).map(([planId, txs]) => {
      const sorted = [...txs].sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0));

      const totalInstallments = sorted[0]?.totalInstallments ?? 0;
      const paidInstallments = sorted.filter((t) => t.installmentNumber != null).length;

      const totalAmount = sorted.reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        planId,
        description: sorted[0]?.note ?? `Plan ${planId.slice(0, 8)}`,
        totalAmount,
        currency: sorted[0]?.currency ?? 'USD',
        paidInstallments,
        totalInstallments,
        nextPaymentDate: null,
        transactions: sorted.map((t) => ({
          id: t.id,
          description: t.note ?? '',
          category: (t.category as { name: string } | null)?.name ?? '',
          amount: Number(t.amount),
          currency: t.currency,
          date: t.date,
          type: t.type,
          installmentPlanId: t.installmentPlanId,
          installmentNumber: t.installmentNumber,
          totalInstallments: t.totalInstallments,
        })),
      };
    });
  });

  const totalActivePlans = computed(() => plans.value.length);

  const totalRemaining = computed(() =>
    plans.value.reduce(
      (sum, plan) =>
        sum + plan.totalAmount * (1 - plan.paidInstallments / Math.max(plan.totalInstallments, 1)),
      0,
    ),
  );

  return {
    plans,
    totalActivePlans,
    totalRemaining,
  };
}
