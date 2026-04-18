<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTransactions } from '@/composables/useTransactions';
import { useBudgets } from '@/composables/useBudgets';
import { useCategories } from '@/composables/useCategories';
import { useAggregations } from '@/composables/useAggregations';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import StatCard from '@/components/base/StatCard.vue';
import BudgetHistoryChart from './budgets/BudgetHistoryChart.vue';
import BudgetInsights from './budgets/BudgetInsights.vue';
import BudgetCategoryGrid from './budgets/BudgetCategoryGrid.vue';
import { formatCurrency } from '@/utils/format';

interface BudgetCardItem {
  id: string;
  categoryId: string;
  categoryName: string;
  budgeted: number;
  spent: number;
  currency: string;
  percentage: number;
  isOverBudget: boolean;
  isNearLimit: boolean;
  alertThreshold: number | null;
  month: string;
}

const { transactions, loading: txLoading } = useTransactions();
const { budgets, alerts, loading: budgetsLoading, refetch: refetchBudgets } = useBudgets();
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

  return alertItems.map((a) => {
    const alert = a as {
      budget?: {
        id?: string;
        categoryId?: string;
        amount?: number;
        alertThreshold?: number | null;
        month?: string;
      };
      spent?: number;
      percentage?: number;
      isOverBudget?: boolean;
      isNearLimit?: boolean;
    };
    const budget = alert.budget;
    const catId = budget?.categoryId ?? '';
    const budgeted = Number(budget?.amount ?? 0);
    const spent = Number(alert.spent ?? 0);

    return {
      id: budget?.id ?? '',
      categoryId: catId,
      categoryName: categoryLookup.value.get(catId) ?? 'Unknown',
      budgeted,
      spent,
      currency: 'USD',
      percentage: budgeted > 0 ? (spent / budgeted) * 100 : 0,
      isOverBudget: alert.isOverBudget ?? false,
      isNearLimit: alert.isNearLimit ?? false,
      alertThreshold: budget?.alertThreshold ?? null,
      month: budget?.month ?? '',
    };
  });
});

/** Sum of all budget amounts. */
const totalBudget = computed(() => budgetItems.value.reduce((sum, b) => sum + b.budgeted, 0));

/** Sum of all spent amounts. */
const totalSpent = computed(() => budgetItems.value.reduce((sum, b) => sum + b.spent, 0));

/** Number of categories over budget. */
const overBudgetCount = computed(() => budgetItems.value.filter((b) => b.isOverBudget).length);

/** Global loading state. */
const isLoading = computed(() => txLoading.value || budgetsLoading.value || categoriesLoading.value);

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
        <StatCard
          title="Total Budget"
          :value="formatCurrency(totalBudget)"
          :subtitle="`${budgetItems.length} categories`"
        />
        <StatCard
          title="Total Spent"
          :value="formatCurrency(totalSpent)"
          :trend="totalBudget > 0
            ? { direction: totalSpent / totalBudget >= 0.9 ? 'down' : 'up', percentage: (totalSpent / totalBudget) * 100 }
            : undefined"
          :subtitle="totalBudget > 0 ? `of ${formatCurrency(totalBudget)}` : undefined"
        />
      </template>
    </ResponsivePageHeader>

    <!-- Section 2: Historical Chart + Insights -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <BudgetHistoryChart
        :monthly-spent="monthlyVelocity"
        :total-budget="totalBudget"
        :loading="isLoading"
      />
      <BudgetInsights
        :total-budget="totalBudget"
        :total-spent="totalSpent"
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
