<script setup lang="ts">
import type { InstallmentPlanDTO, InstallmentObligationDTO } from '@expenses/api';
import Badge from '@/components/base/Badge.vue';
import ProgressBar from '@/components/base/ProgressBar.vue';
import { formatCurrency } from '@/utils/format';

interface Props {
  plans: InstallmentPlanDTO[];
  accountLabels: Record<string, string>;
  loading: boolean;
}

defineProps<Props>();

/** Count paid obligations in a plan. */
function paidCount(plan: InstallmentPlanDTO): number {
  return (plan.obligations ?? []).filter((o: InstallmentObligationDTO) => o.status === 'PAID').length;
}

/** Derive a status variant from plan progress. */
function planStatus(plan: InstallmentPlanDTO): 'success' | 'warning' | 'info' {
  const paid = paidCount(plan);
  if (paid >= plan.installmentsCount) return 'success';
  if (paid >= plan.installmentsCount / 2) return 'info';
  return 'warning';
}

/** Human-readable status label. */
function planStatusLabel(plan: InstallmentPlanDTO): string {
  const paid = paidCount(plan);
  if (paid >= plan.installmentsCount) return 'Completed';
  if (paid >= plan.installmentsCount / 2) return 'On Track';
  return 'In Progress';
}
</script>

<template>
  <section>
    <!-- Loading skeleton -->
    <div
      v-if="loading"
      class="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="animate-pulse rounded-base border border-border-default bg-bg-card p-4"
      >
        <div class="h-4 w-20 rounded bg-bg-primary mb-2" />
        <div class="h-3 w-36 rounded bg-bg-primary mb-2" />
        <div class="h-5 w-24 rounded bg-bg-primary mb-3" />
        <div class="h-1.5 w-full rounded-full bg-bg-primary" />
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="plans.length === 0"
      class="rounded-base border border-border-default bg-bg-card p-8 py-6 text-center"
    >
      <p class="text-sm text-text-muted">
        No active installment plans found.
      </p>
    </div>

    <!-- Plan cards grid -->
    <div
      v-else
      class="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3"
    >
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="rounded-base border border-border-default bg-bg-card p-4 transition-colors hover:bg-bg-card-hover"
      >
        <!-- Top: status badge + title -->
        <div class="mb-2 flex items-start justify-between gap-2">
          <h3 class="text-sm font-medium text-text-primary leading-snug">
            {{ plan.note ?? `Plan ${plan.id.slice(0, 8)}` }}
          </h3>
          <Badge
            :text="planStatusLabel(plan)"
            :variant="planStatus(plan)"
          />
        </div>

        <!-- Amount -->
        <p class="mb-2 font-mono text-lg font-semibold text-text-primary">
          {{ formatCurrency(plan.totalAmount, plan.currency) }}
        </p>

        <!-- Installment count badge -->
        <div class="mb-2">
          <Badge
            :text="`${plan.installmentsCount} installments`"
            variant="default"
          />
        </div>

        <p class="mb-2 text-xs text-text-muted">
          Account: {{ accountLabels[plan.id] ?? 'Missing account' }}
        </p>

        <!-- Progress -->
        <ProgressBar
          :value="paidCount(plan)"
          :max="plan.installmentsCount"
          :label="`${paidCount(plan)} of ${plan.installmentsCount} paid`"
          color="bg-accent-blue"
        />
      </div>
    </div>
  </section>
</template>
