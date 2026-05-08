<script setup lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Vue <script setup> component imports are consumed by the template.
// biome-ignore-all lint/correctness/noUnusedVariables: Vue <script setup> bindings are consumed by the template.
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import ProgressBar from '@/components/base/ProgressBar.vue';
import DonutChart from '@/components/charts/DonutChart.vue';
import type { CategorySplit } from '@/types';
import { formatCurrency } from '@/utils/format';
import type { BudgetCardItem } from '../budgets/presentation';
import type { CurrencyAmount } from '../multiCurrency';
import { getBudgetDisplayState, getTopBudgetItems } from './budgetPresentation';

interface Props {
  budgets: BudgetCardItem[];
  categorySplits: CategorySplit[];
  expenseBreakdown: CurrencyAmount[];
  loading: boolean;
}

const props = defineProps<Props>();
const router = useRouter();

/** Top 3 budget items by comparable native or estimated percentage. */
const topBudgets = computed(() => getTopBudgetItems(props.budgets));

/** Top 6 categories for the 2x3 grid display. */
const topCategories = computed(() => props.categorySplits.slice(0, 6));
const canShowCombinedSpending = computed(() => props.expenseBreakdown.length <= 1);

function barColor(pct: number): string {
  if (pct >= 90) return 'bg-accent-red';
  if (pct >= 70) return 'bg-accent-orange';
  return 'bg-accent-green';
}

function formatNativeSpentLine(entry: CurrencyAmount): string {
  return `${entry.currency} ${formatCurrency(entry.amount, entry.currency)}`;
}

function formatBudgetLimit(amount: number, currency: string | null): string {
  if (!currency) {
    return amount.toFixed(2);
  }

  return formatCurrency(amount, currency);
}
</script>

<template>
  <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)]">
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
            <div class="mb-1 flex items-start justify-between gap-3">
              <div>
                <span class="text-xs text-text-secondary">
                  {{ budget.categoryName }}
                </span>
                <p v-if="getBudgetDisplayState(budget).isEstimated" class="mt-1 text-[11px] text-accent-gold">
                  Estimated valuation
                </p>
                <p
                  v-else-if="getBudgetDisplayState(budget).mode === 'native-only'"
                  class="mt-1 text-[11px] text-text-muted"
                >
                  Native subtotals only
                </p>
              </div>
              <span v-if="getBudgetDisplayState(budget).percentage !== null" class="font-mono text-xs text-text-muted">
                {{ getBudgetDisplayState(budget).percentage?.toFixed(0) }}%
              </span>
            </div>

            <ProgressBar
              v-if="
                getBudgetDisplayState(budget).progressValue !== null &&
                getBudgetDisplayState(budget).progressMax !== null
              "
              :value="getBudgetDisplayState(budget).progressValue ?? 0"
              :max="getBudgetDisplayState(budget).progressMax ?? 0"
              :color="barColor(getBudgetDisplayState(budget).percentage ?? 0)"
            />

            <div
              v-if="getBudgetDisplayState(budget).mode === 'native-only'"
              class="mt-2 space-y-1 rounded-base border border-border-default bg-bg-surface px-3 py-2 text-[11px] text-text-muted"
            >
              <p
                v-for="entry in budget.nativeSpent"
                :key="`${budget.id}-${entry.currency}`"
                class="font-mono text-text-primary"
              >
                {{ formatNativeSpentLine(entry) }}
              </p>
            </div>

            <div v-else class="mt-2 space-y-1 text-[11px] text-text-muted">
              <p class="font-mono text-text-primary">
                <template v-if="getBudgetDisplayState(budget).isEstimated">
                  Estimated
                  {{
                    formatCurrency(
                      getBudgetDisplayState(budget).amount ?? 0,
                      getBudgetDisplayState(budget).currency ?? 'USD',
                    )
                  }}
                </template>
                <template v-else>
                  {{
                    formatCurrency(
                      getBudgetDisplayState(budget).amount ?? 0,
                      getBudgetDisplayState(budget).currency ?? 'USD',
                    )
                  }}
                </template>
                of
                {{
                  formatBudgetLimit(
                    budget.budgeted,
                    getBudgetDisplayState(budget).isEstimated
                      ? null
                      : getBudgetDisplayState(budget).currency,
                  )
                }}
              </p>

              <template v-if="budget.hasMixedSpend">
                <p v-for="entry in budget.nativeSpent" :key="`${budget.id}-native-${entry.currency}`" class="font-mono">
                  {{ formatNativeSpentLine(entry) }}
                </p>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Right card: Spending Donut & Category Split -->
      <div
        class="rounded-base border border-border-default bg-bg-card p-5"
      >
        <div class="flex flex-col gap-6 xl:flex-row xl:items-center">
          <!-- Donut chart — larger -->
          <div class="shrink-0 xl:w-[260px]">
            <DonutChart
              v-if="categorySplits.length > 0 && canShowCombinedSpending"
              :categories="categorySplits"
              center-label="TOTAL"
              :center-value="formatCurrency(expenseBreakdown[0]?.amount ?? 0, expenseBreakdown[0]?.currency ?? 'USD')"
              height="220"
            />
              <div
                v-else-if="expenseBreakdown.length > 1"
                class="flex h-[220px] w-full flex-col items-center justify-center rounded-base bg-bg-primary px-4 text-center text-xs text-text-muted xl:w-[220px] xl:rounded-full"
              >
                Mixed native currencies

              <span class="mt-2 block">
                Category totals stay hidden until an estimated valuation is available.
              </span>
            </div>
            <div
              v-else
              class="flex h-[220px] w-full items-center justify-center rounded-base bg-bg-primary text-xs text-text-muted xl:w-[220px] xl:rounded-full"
            >
              No data
            </div>
          </div>

          <!-- Category distribution grid — more space -->
          <div class="flex-1 min-w-0">
            <p class="mb-3 text-xs font-medium tracking-wider text-text-muted">
              CATEGORY DISTRIBUTION
            </p>

            <div v-if="expenseBreakdown.length > 1" class="py-4 text-center text-xs text-text-muted">
              Native expense subtotals stay visible above. Estimated category distribution is deferred until valuation coverage exists.
            </div>

            <div v-else-if="topCategories.length === 0" class="py-4 text-center text-xs text-text-muted">
              No spending data
            </div>

            <div v-else class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
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
