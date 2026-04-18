<script setup lang="ts">
import { computed } from 'vue';
import type { InstallmentPlanDTO, InstallmentObligationDTO } from '@expenses/api';
import { formatCurrency, formatDate } from '@/utils/format';

interface Props {
  plans: InstallmentPlanDTO[];
  totalRemaining: number;
  loading: boolean;
}

const props = defineProps<Props>();

/** Find the earliest upcoming PENDING obligation due date across all plans. */
const nextPaymentDate = computed<string | null>(() => {
  const upcoming: string[] = [];
  for (const plan of props.plans) {
    for (const obligation of plan.obligations ?? []) {
      if (obligation.status === 'PENDING' && obligation.dueDate) {
        upcoming.push(obligation.dueDate);
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

/** Total remaining PENDING obligations across all plans. */
const remainingPayments = computed(() => {
  return props.plans.reduce(
    (sum, plan) =>
      sum + (plan.obligations ?? []).filter((o: InstallmentObligationDTO) => o.status === 'PENDING').length,
    0,
  );
});
</script>

<template>
  <section>
    <!-- Loading skeleton -->
    <div
      v-if="loading"
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div
        v-for="i in 4"
        :key="i"
        class="animate-pulse rounded-base border border-border-default bg-bg-card p-3"
      >
        <div class="h-3 w-16 rounded bg-bg-primary mb-1.5" />
        <div class="h-5 w-20 rounded bg-bg-primary" />
      </div>
    </div>

    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <!-- Upcoming 30D -->
      <div class="rounded-base border border-border-default bg-bg-card p-3">
        <p class="text-[10px] font-medium tracking-wider text-text-muted">
          NEXT PAYMENT
        </p>
        <p class="mt-0.5 font-mono text-base font-semibold text-text-primary">
          {{ nextPaymentDate ? formatDate(nextPaymentDate) : 'None' }}
        </p>
      </div>

      <!-- Projected zero -->
      <div class="rounded-base border border-border-default bg-bg-card p-3">
        <p class="text-[10px] font-medium tracking-wider text-text-muted">
          REMAINING
        </p>
        <p class="mt-0.5 font-mono text-base font-semibold text-text-primary">
          {{ plans.length > 0 ? `${remainingPayments} payments` : 'N/A' }}
        </p>
      </div>

      <!-- Interest rate -->
      <div class="rounded-base border border-border-default bg-bg-card p-3">
        <p class="text-[10px] font-medium tracking-wider text-text-muted">
          INTEREST RATE
        </p>
        <p class="mt-0.5 font-mono text-base font-semibold text-text-primary">
          {{ interestRate }}
        </p>
      </div>

      <!-- Remaining debt -->
      <div class="rounded-base border border-border-default bg-bg-card p-3">
        <p class="text-[10px] font-medium tracking-wider text-text-muted">
          REMAINING DEBT
        </p>
        <p class="mt-0.5 font-mono text-base font-semibold text-text-primary">
          {{ formatCurrency(totalRemaining) }}
        </p>
      </div>
    </div>
  </section>
</template>
