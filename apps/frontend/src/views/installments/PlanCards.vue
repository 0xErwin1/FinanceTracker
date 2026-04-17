<script setup lang="ts">
import type { InstallmentPlan } from '@/types';
import Badge from '@/components/base/Badge.vue';
import ProgressBar from '@/components/base/ProgressBar.vue';
import { formatCurrency } from '@/utils/format';

interface Props {
  plans: InstallmentPlan[];
  loading: boolean;
}

defineProps<Props>();

/** Derive a status variant from plan progress. */
function planStatus(plan: InstallmentPlan): 'success' | 'warning' | 'info' {
  if (plan.paidInstallments >= plan.totalInstallments) return 'success';
  if (plan.paidInstallments >= plan.totalInstallments / 2) return 'info';
  return 'warning';
}

/** Human-readable status label. */
function planStatusLabel(plan: InstallmentPlan): string {
  if (plan.paidInstallments >= plan.totalInstallments) return 'Completed';
  if (plan.paidInstallments >= plan.totalInstallments / 2) return 'On Track';
  return 'In Progress';
}
</script>

<template>
  <section>
    <h2 class="mb-3 text-sm font-medium text-text-secondary">
      Active Plans
    </h2>

    <!-- Loading skeleton -->
    <div
      v-if="loading"
      class="grid grid-cols-3 gap-4"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="animate-pulse rounded-base border border-border-default bg-bg-card p-5"
      >
        <div class="h-4 w-20 rounded bg-bg-primary mb-3" />
        <div class="h-3 w-36 rounded bg-bg-primary mb-2" />
        <div class="h-5 w-24 rounded bg-bg-primary mb-4" />
        <div class="h-1.5 w-full rounded-full bg-bg-primary" />
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="plans.length === 0"
      class="rounded-base border border-border-default bg-bg-card p-8 text-center"
    >
      <p class="text-sm text-text-muted">
        No active installment plans found.
      </p>
    </div>

    <!-- Plan cards grid -->
    <div
      v-else
      class="grid grid-cols-3 gap-4"
    >
      <div
        v-for="plan in plans"
        :key="plan.planId"
        class="rounded-base border border-border-default bg-bg-card p-5 transition-colors hover:bg-bg-card-hover"
      >
        <!-- Top: status badge + title -->
        <div class="mb-3 flex items-start justify-between gap-2">
          <h3 class="text-sm font-medium text-text-primary leading-snug">
            {{ plan.description }}
          </h3>
          <Badge
            :text="planStatusLabel(plan)"
            :variant="planStatus(plan)"
          />
        </div>

        <!-- Amount -->
        <p class="mb-3 font-mono text-lg font-semibold text-text-primary">
          {{ formatCurrency(plan.totalAmount, plan.currency) }}
        </p>

        <!-- Installment count badge -->
        <div class="mb-3">
          <Badge
            :text="`${plan.totalInstallments} installments`"
            variant="default"
          />
        </div>

        <!-- Progress -->
        <ProgressBar
          :value="plan.paidInstallments"
          :max="plan.totalInstallments"
          :label="`${plan.paidInstallments} of ${plan.totalInstallments} paid`"
          color="bg-accent-blue"
        />
      </div>
    </div>
  </section>
</template>
