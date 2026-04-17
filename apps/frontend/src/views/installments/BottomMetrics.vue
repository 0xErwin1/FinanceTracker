<script setup lang="ts">
import type { InstallmentPlan } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';

interface Props {
  plans: InstallmentPlan[];
  totalRemaining: number;
  loading: boolean;
}

const props = defineProps<Props>();

import { computed } from 'vue';

/** Find the next upcoming payment date across all plans. */
const nextPaymentDate = computed<string | null>(() => {
  const upcoming: string[] = [];
  for (const plan of props.plans) {
    for (const tx of plan.transactions) {
      if (
        tx.installmentNumber != null &&
        tx.installmentNumber === plan.paidInstallments + 1 &&
        tx.date
      ) {
        upcoming.push(tx.date);
      }
    }
  }
  if (upcoming.length === 0) return null;
  upcoming.sort();
  return upcoming[0];
});

/** Compute a mock interest rate (not available from backend). */
const interestRate = computed(() => {
  if (props.plans.length === 0) return 'N/A';
  return '~2.5%';
});

/** Weighted average remaining installments. */
const avgRemaining = computed(() => {
  if (props.plans.length === 0) return 0;
  const total = props.plans.reduce(
    (sum, p) => sum + (p.totalInstallments - p.paidInstallments),
    0,
  );
  return total;
});
</script>

<template>
  <section>
    <!-- Loading skeleton -->
    <div
      v-if="loading"
      class="grid grid-cols-4 gap-4"
    >
      <div
        v-for="i in 4"
        :key="i"
        class="animate-pulse rounded-base border border-border-default bg-bg-card p-4"
      >
        <div class="h-3 w-16 rounded bg-bg-primary mb-2" />
        <div class="h-5 w-20 rounded bg-bg-primary" />
      </div>
    </div>

    <div v-else class="grid grid-cols-4 gap-4">
      <!-- Upcoming 30D -->
      <div class="rounded-base border border-border-default bg-bg-card p-4">
        <p class="text-xs font-medium tracking-wider text-text-muted">
          UPCOMING 30D
        </p>
        <p class="mt-1 font-mono text-lg font-semibold text-text-primary">
          {{ nextPaymentDate ? formatDate(nextPaymentDate) : 'None' }}
        </p>
      </div>

      <!-- Projected zero -->
      <div class="rounded-base border border-border-default bg-bg-card p-4">
        <p class="text-xs font-medium tracking-wider text-text-muted">
          PROJECTED ZERO
        </p>
        <p class="mt-1 font-mono text-lg font-semibold text-text-primary">
          {{ plans.length > 0 ? `${avgRemaining} payments` : 'N/A' }}
        </p>
      </div>

      <!-- Interest rate -->
      <div class="rounded-base border border-border-default bg-bg-card p-4">
        <p class="text-xs font-medium tracking-wider text-text-muted">
          INTEREST RATE
        </p>
        <p class="mt-1 font-mono text-lg font-semibold text-text-primary">
          {{ interestRate }}
        </p>
      </div>

      <!-- Active protocols -->
      <div class="rounded-base border border-border-default bg-bg-card p-4">
        <p class="text-xs font-medium tracking-wider text-text-muted">
          REMAINING DEBT
        </p>
        <p class="mt-1 font-mono text-lg font-semibold text-text-primary">
          {{ formatCurrency(totalRemaining) }}
        </p>
      </div>
    </div>
  </section>
</template>
