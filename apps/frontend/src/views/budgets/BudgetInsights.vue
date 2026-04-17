<script setup lang="ts">
import { computed } from 'vue';
import ProgressBar from '@/components/base/ProgressBar.vue';
import InsightCard from '@/components/base/InsightCard.vue';
import { formatCurrency } from '@/utils/format';

interface Props {
  totalBudget: number;
  totalSpent: number;
  alertCount: number;
  overBudgetCount: number;
  loading: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ adjustBudgets: [] }>();

const usagePercent = computed(() => {
  if (props.totalBudget <= 0) return 0;
  return (props.totalSpent / props.totalBudget) * 100;
});

const remaining = computed(() =>
  Math.max(props.totalBudget - props.totalSpent, 0),
);

const insightMessage = computed(() => {
  if (props.totalBudget <= 0) return 'No budget data available for this period.';
  if (props.overBudgetCount > 0) {
    return `${props.overBudgetCount} ${props.overBudgetCount === 1 ? 'category is' : 'categories are'} over budget. Consider adjusting allocations or reducing discretionary spending.`;
  }
  if (usagePercent.value >= 70) {
    return `You've used ${usagePercent.value.toFixed(0)}% of your total budget. ${formatCurrency(remaining.value)} remaining — stay on track for the rest of the month.`;
  }
  return `Great discipline! You've used only ${usagePercent.value.toFixed(0)}% of your budget with ${formatCurrency(remaining.value)} remaining.`;
});

const insightSeverity = computed<'info' | 'success' | 'warning'>(() => {
  if (props.overBudgetCount > 0 || usagePercent.value >= 90) return 'warning';
  if (usagePercent.value >= 70) return 'info';
  return 'success';
});
</script>

<template>
  <div
    class="rounded-base border border-border-default bg-bg-card p-5"
  >
    <!-- Loading skeleton -->
    <div v-if="loading" class="animate-pulse space-y-4">
      <div class="h-4 w-28 rounded bg-bg-primary" />
      <div class="h-8 w-full rounded bg-bg-primary" />
      <div class="h-16 w-full rounded bg-bg-primary" />
      <div class="h-8 w-32 rounded bg-bg-primary" />
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Heading -->
      <div class="mb-4 flex items-center gap-2">
        <span class="flex h-5 w-5 items-center justify-center rounded-full bg-accent-gold/20 text-xs text-accent-gold">
          &#8593;
        </span>
        <h3 class="text-sm font-medium text-text-primary">
          Projections
        </h3>
      </div>

      <!-- Budget usage metric -->
      <div class="mb-4">
        <div class="mb-1 flex items-center justify-between">
          <span class="text-xs font-medium tracking-wider text-text-muted">
            BUDGET USAGE
          </span>
          <span class="font-mono text-xs text-text-primary">
            {{ usagePercent.toFixed(0) }}%
          </span>
        </div>
        <ProgressBar
          :value="totalSpent"
          :max="totalBudget"
          :color="usagePercent >= 90 ? 'bg-accent-red' : usagePercent >= 70 ? 'bg-accent-orange' : 'bg-accent-green'"
        />
      </div>

      <!-- Remaining budget -->
      <div class="mb-4 flex items-center justify-between">
        <span class="text-xs font-medium tracking-wider text-text-muted">
          REMAINING
        </span>
        <span class="font-mono text-sm font-semibold text-text-primary">
          {{ formatCurrency(remaining) }}
        </span>
      </div>

      <!-- Insight card -->
      <InsightCard
        title="Recommendation"
        :message="insightMessage"
        :severity="insightSeverity"
      />

      <!-- Action button -->
      <button
        class="mt-4 w-full rounded-base bg-accent-gold/10 px-4 py-2 text-xs font-medium text-accent-gold transition-colors hover:bg-accent-gold/20"
        type="button"
        @click="emit('adjustBudgets')"
      >
        Adjust Budgets
      </button>
    </template>
  </div>
</template>
