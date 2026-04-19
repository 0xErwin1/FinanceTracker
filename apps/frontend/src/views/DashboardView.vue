<script setup lang="ts">
import { computed } from 'vue';
import { useTransactions } from '@/composables/useTransactions';
import { useBudgets } from '@/composables/useBudgets';
import { useGoals } from '@/composables/useGoals';
import { useCategories } from '@/composables/useCategories';
import { useRecurring } from '@/composables/useRecurring';
import { useAggregations } from '@/composables/useAggregations';
import { useAccounts } from '@/composables/useAccounts';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import type { BudgetCategory } from '@/types';
import AccountBalanceCards from './dashboard/AccountBalanceCards.vue';
import HeroBalance from './dashboard/HeroBalance.vue';
import BudgetsSpending from './dashboard/BudgetsSpending.vue';
import GoalsTransactions from './dashboard/GoalsTransactions.vue';

const { transactions, loading: txLoading } = useTransactions();

const { budgets, alerts, loading: budgetsLoading } = useBudgets();

const { categories, loading: categoriesLoading } = useCategories();

const { goals, loading: goalsLoading } = useGoals();

const { recurring, loading: recurringLoading } = useRecurring();
const { summaries: accountSummaries, loading: accountsLoading } = useAccounts();

const {
  totalIncome,
  totalExpenses,
  netSavings,
  netSavingsByCurrency,
  monthlyVelocity,
  monthlyIncomeExpenses,
  currentMonthDaily,
  spendingByCategory,
} = useAggregations(transactions);

const recentDashboardTransactions = computed(() =>
  transactions.value.filter((transaction) => transaction.transferGroupId == null),
);

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

/** Sum of active recurring transaction amounts. */
const recurringTotal = computed(() => {
  const items = recurring.value;
  if (!Array.isArray(items)) return 0;
  return items
    .filter((r) => (r as { active?: boolean }).active !== false)
    .reduce((sum, r) => sum + Number((r as { amount?: number }).amount ?? 0), 0);
});

/** Build BudgetCategory[] from budget alerts with category name lookup. */
const budgetCategories = computed<BudgetCategory[]>(() => {
  const alertItems = alerts.value;
  if (!Array.isArray(alertItems)) return [];

  return alertItems.map((a) => {
    const alert = a as {
      budget?: { categoryId?: string; amount?: number };
      spent?: number;
      percentage?: number;
    };
    const budget = alert.budget;
    const catId = budget?.categoryId ?? '';
    return {
      categoryId: catId,
      categoryName: categoryLookup.value.get(catId) ?? 'Unknown',
      budgeted: Number(budget?.amount ?? 0),
      spent: Number(alert.spent ?? 0),
      currency: 'USD',
    };
  });
});

/** Global loading state — true while any critical data source is fetching. */
const isLoading = computed(
  () =>
    txLoading.value ||
    accountsLoading.value ||
    budgetsLoading.value ||
    goalsLoading.value ||
    recurringLoading.value ||
    categoriesLoading.value,
);
</script>

<template>
  <div class="space-y-4 lg:space-y-5">
    <ResponsivePageHeader
      title="Dashboard"
      subtitle="Key balances, budgets, and recent activity now reflow without clipping cards or charts on smaller screens."
    />

    <!-- Section 1: Hero Balance & Projections -->
    <HeroBalance
      :total-income="totalIncome"
      :total-expenses="totalExpenses"
      :net-savings="netSavings"
      :net-savings-by-currency="netSavingsByCurrency"
      :monthly-velocity="monthlyVelocity"
      :monthly-income-expenses="monthlyIncomeExpenses"
      :current-month-daily="currentMonthDaily"
      :recurring-total="recurringTotal"
      :loading="isLoading"
    />

    <AccountBalanceCards :summaries="accountSummaries" :loading="isLoading" />

    <!-- Section 2: Budgets & Spending Distribution -->
    <BudgetsSpending
      :budgets="budgetCategories"
      :category-splits="spendingByCategory"
      :total-expenses="totalExpenses"
      :loading="isLoading"
    />

    <!-- Section 3: Goals & Transactions -->
    <GoalsTransactions
      :transactions="recentDashboardTransactions"
      :goals="goals"
      :loading="isLoading"
    />

  </div>
</template>
