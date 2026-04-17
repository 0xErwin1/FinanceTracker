<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { CategorySplit, BudgetCategory } from '@/types';
import ProgressBar from '@/components/base/ProgressBar.vue';
import DonutChart from '@/components/charts/DonutChart.vue';
import { formatCurrency } from '@/utils/format';

interface Props {
  budgets: BudgetCategory[];
  categorySplits: CategorySplit[];
  totalExpenses: number;
  loading: boolean;
}

const props = defineProps<Props>();
const router = useRouter();

/** Top 3 budget items by percentage spent. */
const topBudgets = computed(() =>
  props.budgets
    .map((b) => ({
      ...b,
      percentage: b.budgeted > 0 ? (b.spent / b.budgeted) * 100 : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3),
);

/** Top 6 categories for the 2x3 grid display. */
const topCategories = computed(() => props.categorySplits.slice(0, 6));

function barColor(pct: number): string {
  if (pct >= 90) return 'bg-accent-red';
  if (pct >= 70) return 'bg-accent-orange';
  return 'bg-accent-green';
}
</script>

<template>
  <div class="grid grid-cols-[1fr_2fr] gap-4">
    <!-- Loading skeleton -->
    <template v-if="loading">
      <div class="animate-pulse rounded-base border border-border-default bg-bg-card p-5">
        <div class="h-4 w-36 rounded bg-bg-primary mb-4" />
        <div class="space-y-4">
          <div class="h-12 rounded-base bg-bg-primary" />
          <div class="h-12 rounded-base bg-bg-primary" />
          <div class="h-12 rounded-base bg-bg-primary" />
        </div>
      </div>
      <div class="animate-pulse rounded-base border border-border-default bg-bg-card p-5">
        <div class="h-48 w-full rounded-base bg-bg-primary" />
      </div>
    </template>

    <!-- Content -->
    <template v-else>
      <!-- Left card: Budget Alerts -->
      <div
        class="cursor-pointer rounded-base border border-border-default bg-bg-card p-5 transition-colors hover:bg-bg-card-hover"
        @click="router.push('/budgets')"
      >
        <div class="mb-4 flex items-center justify-between">
          <p class="text-xs font-medium tracking-wider text-text-muted">
            BUDGET CONSTRAINTS
          </p>
          <span class="text-text-muted">&#8250;</span>
        </div>

        <div v-if="topBudgets.length === 0" class="py-4 text-center text-xs text-text-muted">
          No budget data available
        </div>

        <div v-else class="space-y-4">
          <div v-for="budget in topBudgets" :key="budget.categoryId">
            <div class="mb-1 flex items-center justify-between">
              <span class="text-xs text-text-secondary">
                {{ budget.categoryName }}
              </span>
              <span class="font-mono text-xs text-text-muted">
                {{ budget.percentage.toFixed(0) }}%
              </span>
            </div>
            <ProgressBar
              :value="budget.spent"
              :max="budget.budgeted"
              :color="barColor(budget.percentage)"
            />
          </div>
        </div>
      </div>

      <!-- Right card: Spending Donut & Category Split -->
      <div
        class="rounded-base border border-border-default bg-bg-card p-5"
      >
        <div class="flex gap-8">
          <!-- Donut chart — larger -->
          <div class="shrink-0">
            <DonutChart
              v-if="categorySplits.length > 0"
              :categories="categorySplits"
              center-label="TOTAL"
              :center-value="formatCurrency(totalExpenses)"
              height="220"
            />
            <div
              v-else
              class="flex h-[220px] w-[220px] items-center justify-center rounded-full bg-bg-primary text-xs text-text-muted"
            >
              No data
            </div>
          </div>

          <!-- Category distribution grid — more space -->
          <div class="flex-1 min-w-0">
            <p class="mb-3 text-xs font-medium tracking-wider text-text-muted">
              CATEGORY DISTRIBUTION
            </p>

            <div v-if="topCategories.length === 0" class="py-4 text-center text-xs text-text-muted">
              No spending data
            </div>

            <div v-else class="grid grid-cols-2 gap-x-4 gap-y-3">
              <div
                v-for="cat in topCategories"
                :key="cat.category"
                class="flex items-center gap-2.5"
              >
                <span
                  class="inline-block h-3 w-3 shrink-0 rounded-full"
                  :style="{ backgroundColor: cat.color ?? '#64748b' }"
                />
                <div class="min-w-0">
                  <p class="truncate text-xs text-text-secondary">
                    {{ cat.category }}
                  </p>
                  <p class="font-mono text-xs font-medium text-text-primary">
                    {{ formatCurrency(cat.amount) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
