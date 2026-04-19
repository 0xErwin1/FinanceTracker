<script setup lang="ts">
import { computed, ref } from 'vue';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import StatCard from '@/components/base/StatCard.vue';
import { useAggregations } from '@/composables/useAggregations';
import { useBudgets } from '@/composables/useBudgets';
import { useCategories } from '@/composables/useCategories';
import { useTransactions } from '@/composables/useTransactions';
import { formatCurrency } from '@/utils/format';
import BudgetCategoryGrid from './budgets/BudgetCategoryGrid.vue';
import BudgetHistoryChart from './budgets/BudgetHistoryChart.vue';
import BudgetInsights from './budgets/BudgetInsights.vue';
import { type BudgetCardItem, buildBudgetCardItem } from './budgets/presentation';
import { buildBudgetTotalsByCurrency, summarizeCurrencyMap } from './multiCurrency';
import { getValuationCoverageMessage, getValuationSummaryLabel } from './valuation';

const { transactions, loading: txLoading } = useTransactions();
const {
  budgets,
  alerts,
  valuationSnapshot: budgetValuationSnapshot,
  loading: budgetsLoading,
  refetch: refetchBudgets,
} = useBudgets();
const { categories, loading: categoriesLoading } = useCategories();
const { monthlyVelocity } = useAggregations(transactions);

/** Ref for scrolling to the budget grid section. */
const gridSectionRef = ref<HTMLElement | null>(null);

/** Category name lookup by ID. */
const categoryLookup = computed(() => {
  const items = categories.value;
  if (!Array.isArray(items)) return new Map<string, string>();

  const map = new Map<string, string>();
  for (const cat of items) {
    const c = cat as { id?: string; name?: string };
    if (c.id && c.name) map.set(c.id, c.name);
  }
  return map;
});

/** Build enriched budget items from alerts with category name and status flags. */
const budgetItems = computed<BudgetCardItem[]>(() => {
  const alertItems = alerts.value;
  if (!Array.isArray(alertItems)) return [];

  return alertItems.map((alert) => {
    const categoryId = alert.budget?.categoryId ?? '';

    return buildBudgetCardItem(alert, categoryLookup.value.get(categoryId) ?? 'Unknown');
  });
});

/** Sum of all budget amounts. */
const totalBudget = computed(() => budgetItems.value.reduce((sum, b) => sum + b.budgeted, 0));

/** Sum of all spent amounts. */
const totalSpent = computed(() => budgetItems.value.reduce((sum, budget) => sum + (budget.spent ?? 0), 0));

/** Number of categories over budget. */
const overBudgetCount = computed(() => budgetItems.value.filter((b) => b.isOverBudget).length);

/** Global loading state. */
const isLoading = computed(() => txLoading.value || budgetsLoading.value || categoriesLoading.value);

const nativeBudgetTotals = computed(() =>
  buildBudgetTotalsByCurrency(
    budgetItems.value
      .filter((budget) => budget.currency !== null && !budget.hasMixedSpend)
      .map((budget) => ({
        currency: budget.currency ?? 'USD',
        budgeted: budget.budgeted,
        spent: budget.spent ?? 0,
      })),
  ),
);
const nativeSpentTotals = computed(() => {
  const totalsByCurrency = alerts.value.reduce<Record<string, number>>((accumulator, alert) => {
    const nativeSpentByCurrency = alert.nativeSpentByCurrency ?? {};

    for (const [currency, amount] of Object.entries(nativeSpentByCurrency as Record<string, number>)) {
      accumulator[currency] = (accumulator[currency] ?? 0) + amount;
    }

    return accumulator;
  }, {});

  return summarizeCurrencyMap(totalsByCurrency);
});
const canShowCombinedBudgetTotals = computed(
  () =>
    !budgetItems.value.some((budget) => budget.hasMixedSpend) &&
    !nativeBudgetTotals.value.hasMultipleCurrencies,
);
const budgetValuationLabel = computed(() => getValuationSummaryLabel(budgetValuationSnapshot.value));
const budgetValuationMessage = computed(() => getValuationCoverageMessage(budgetValuationSnapshot.value));
const budgetEstimatedTotal = computed(() => budgetValuationSnapshot.value?.estimatedTotal ?? null);
const budgetReportingCurrency = computed(() => budgetValuationSnapshot.value?.reportingCurrency ?? null);

/** Categories list for the grid's create form. */
const categoryOptions = computed(() => {
  const items = categories.value;
  if (!Array.isArray(items)) return [];
  return items.map((c) => {
    const cat = c as { id?: string; name?: string; type?: string };
    return { id: cat.id ?? '', name: cat.name ?? '', type: cat.type ?? '' };
  });
});

/** Scroll to the budget grid section. */
function scrollToGrid() {
  gridSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <div class="space-y-4 lg:space-y-5">
    <!-- Section 1: Header -->
    <ResponsivePageHeader
      title="Budgets"
      subtitle="Track and manage monthly spending limits without losing context or actions on smaller screens."
    >
      <template #actions>
        <template v-if="canShowCombinedBudgetTotals">
          <StatCard
            title="Total Budget"
            :value="formatCurrency(totalBudget, nativeBudgetTotals.budgeted[0]?.currency ?? 'USD')"
            :subtitle="`${budgetItems.length} categories`"
          />
          <StatCard
            title="Total Spent"
            :value="formatCurrency(totalSpent, nativeBudgetTotals.spent[0]?.currency ?? 'USD')"
            :trend="totalBudget > 0
              ? { direction: totalSpent / totalBudget >= 0.9 ? 'down' : 'up', percentage: (totalSpent / totalBudget) * 100 }
              : undefined"
            :subtitle="totalBudget > 0 ? `of ${formatCurrency(totalBudget, nativeBudgetTotals.budgeted[0]?.currency ?? 'USD')}` : undefined"
          />
        </template>
        <div v-else class="rounded-base border border-border-default bg-bg-surface px-4 py-3 text-xs text-text-muted">
          Native spend subtotals only while budget activity spans multiple currencies.

          <div class="mt-2 space-y-1 font-mono">
            <p v-for="entry in nativeSpentTotals.entries" :key="`spent-${entry.currency}`">
              Spent {{ entry.currency }}: {{ formatCurrency(entry.amount, entry.currency) }}
            </p>
          </div>
        </div>
      </template>
    </ResponsivePageHeader>

    <div
      v-if="budgetItems.some((budget) => budget.hasMixedSpend)"
      class="rounded-base border border-border-default bg-bg-card px-4 py-3 text-sm text-text-muted"
    >
      {{ budgetValuationMessage }}

      <p v-if="budgetEstimatedTotal !== null && budgetReportingCurrency" class="mt-2 text-xs text-accent-gold">
        {{ budgetValuationLabel }}: {{ formatCurrency(budgetEstimatedTotal, budgetReportingCurrency) }}
      </p>
    </div>

    <!-- Section 2: Historical Chart + Insights -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <BudgetHistoryChart
        :monthly-spent="monthlyVelocity"
        :total-budget="canShowCombinedBudgetTotals ? totalBudget : 0"
        :loading="isLoading"
      />
      <BudgetInsights
        :total-budget="canShowCombinedBudgetTotals ? totalBudget : 0"
        :total-spent="canShowCombinedBudgetTotals ? totalSpent : 0"
        :alert-count="budgetItems.length"
        :over-budget-count="overBudgetCount"
        :loading="isLoading"
        @adjust-budgets="scrollToGrid"
      />
    </div>

    <!-- Section 3: Budget Category Grid -->
    <div
      ref="gridSectionRef"
      class="rounded-base border border-border-default bg-bg-surface p-4 sm:p-5"
    >
      <BudgetCategoryGrid
        :budgets="budgetItems"
        :categories="categoryOptions"
        :loading="isLoading"
        @refresh="refetchBudgets"
      />
    </div>
  </div>
</template>
