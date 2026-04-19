<script setup lang="ts">
import type { ValuationSnapshotDTO } from '@expenses/api';
import { computed } from 'vue';
import InsightCard from '@/components/base/InsightCard.vue';
import ProgressBar from '@/components/base/ProgressBar.vue';
import LineBarChart from '@/components/charts/LineBarChart.vue';
import type { ChartDataPoint, DailyData, MonthlyData } from '@/types';
import { formatCurrency } from '@/utils/format';
import type { CurrencyAmount } from '../multiCurrency';
import { getValuationCoverageMessage, getValuationSummaryLabel } from '../valuation';

interface Props {
  incomeBreakdown: CurrencyAmount[];
  expenseBreakdown: CurrencyAmount[];
  savingsBreakdown: CurrencyAmount[];
  valuationSnapshot: ValuationSnapshotDTO | null;
  monthlyVelocity: ChartDataPoint[];
  monthlyIncomeExpenses: MonthlyData[];
  currentMonthDaily: DailyData[];
  recurringTotal: number;
  loading: boolean;
}

const props = defineProps<Props>();

const primaryIncome = computed(() => props.incomeBreakdown[0] ?? null);
const primaryExpense = computed(() => props.expenseBreakdown[0] ?? null);
const primarySavings = computed(() => props.savingsBreakdown[0] ?? null);

const canShowCombinedTrend = computed(
  () =>
    props.incomeBreakdown.length <= 1 &&
    props.expenseBreakdown.length <= 1 &&
    props.savingsBreakdown.length <= 1,
);

const burnPercent = computed(() => {
  if (
    !primaryIncome.value ||
    !primaryExpense.value ||
    primaryIncome.value.currency !== primaryExpense.value.currency
  ) {
    return 0;
  }

  if (primaryIncome.value.amount <= 0) return 0;

  return (primaryExpense.value.amount / primaryIncome.value.amount) * 100;
});

const recurringPercent = computed(() => {
  if (!primaryIncome.value || primaryIncome.value.amount <= 0) return 0;
  return (props.recurringTotal / primaryIncome.value.amount) * 100;
});

const projectedSavingsMsg = computed(() => {
  if (!primaryIncome.value || !primarySavings.value) {
    return 'Native balances span multiple currencies. Estimated savings stay hidden until valuation coverage is available.';
  }

  if (primaryIncome.value.currency !== primarySavings.value.currency || primaryIncome.value.amount <= 0) {
    return 'Insufficient native data';
  }

  const rate = ((primarySavings.value.amount / primaryIncome.value.amount) * 100).toFixed(0);
  return `+${rate}% savings rate this period`;
});

const savingsBreakdown = computed(() => props.savingsBreakdown);
const valuationLabel = computed(() => getValuationSummaryLabel(props.valuationSnapshot));
const valuationMessage = computed(() => getValuationCoverageMessage(props.valuationSnapshot));
const valuationEstimatedTotal = computed(() => props.valuationSnapshot?.estimatedTotal ?? null);
const valuationReportingCurrency = computed(() => props.valuationSnapshot?.reportingCurrency ?? null);

/** Daily expenses as bar chart data points (current month, labeled by day number). */
const barData = computed<ChartDataPoint[]>(() =>
  props.currentMonthDaily.map((d) => ({
    label: String(d.day),
    value: d.expenses,
  })),
);

/** Running balance as line chart data points (current month, labeled by day number). */
const lineData = computed<ChartDataPoint[]>(() =>
  props.currentMonthDaily.map((d) => ({
    label: String(d.day),
    value: d.balance,
  })),
);
</script>

<template>
  <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
    <!-- Loading skeleton -->
    <template v-if="loading">
      <div class="animate-pulse rounded-base border border-border-default bg-bg-card p-5">
        <div class="h-4 w-32 rounded bg-bg-primary mb-4" />
        <div class="mb-4 flex flex-col gap-3 sm:flex-row">
          <div class="h-14 w-28 rounded-base bg-bg-primary" />
          <div class="h-14 w-28 rounded-base bg-bg-primary" />
        </div>
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <div class="h-24 w-40 rounded-base bg-bg-primary" />
          <div class="h-48 rounded-base bg-bg-primary" />
        </div>
      </div>
      <div class="animate-pulse rounded-base border border-border-default bg-bg-card p-5">
        <div class="h-4 w-44 rounded bg-bg-primary mb-4" />
        <div class="space-y-4">
          <div class="h-12 rounded-base bg-bg-primary" />
          <div class="h-12 rounded-base bg-bg-primary" />
        </div>
      </div>
    </template>

    <!-- Content -->
    <template v-else>
      <!-- Left card: Main Balance Period -->
      <div
        class="rounded-base border border-border-default bg-bg-card p-5"
      >
        <!-- Top row: Period label + Income/Expense metrics + Net Savings inline -->
        <div class="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            <h3 class="text-sm font-medium text-text-secondary">
              Current Period
            </h3>

            <!-- Compact Net Savings -->
            <div class="rounded-base bg-bg-primary px-3 py-2 sm:min-w-[220px]">
              <p class="text-[10px] font-medium tracking-wider text-text-muted">
                NET SAVINGS
              </p>
              <p v-if="primarySavings" class="font-mono text-lg font-bold text-text-primary">
                {{ formatCurrency(primarySavings.amount, primarySavings.currency) }}
              </p>
              <p v-if="valuationEstimatedTotal !== null && valuationReportingCurrency" class="mt-1 text-xs text-accent-gold">
                {{ valuationLabel }}: {{ formatCurrency(valuationEstimatedTotal, valuationReportingCurrency) }}
              </p>
              <p v-else class="text-xs text-text-muted">
                Native totals only — no estimated combined savings yet.
              </p>
              <div v-if="savingsBreakdown.length > 0" class="space-y-0">
                <p
                  v-for="entry in savingsBreakdown"
                  :key="entry.currency"
                  class="font-mono text-[10px] text-text-muted"
                >
                  {{ entry.currency }}: {{ formatCurrency(entry.amount, entry.currency) }}
                </p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[240px]">
            <div class="rounded-base bg-bg-primary px-3 py-2">
              <p class="text-xs text-text-muted">Income</p>
              <div v-if="incomeBreakdown.length > 0" class="space-y-1">
                <p
                  v-for="entry in incomeBreakdown"
                  :key="entry.currency"
                  class="font-mono text-sm font-semibold text-accent-green"
                >
                  {{ formatCurrency(entry.amount, entry.currency) }}
                </p>
              </div>
            </div>
            <div class="rounded-base bg-bg-primary px-3 py-2">
              <p class="text-xs text-text-muted">Expenses</p>
              <div v-if="expenseBreakdown.length > 0" class="space-y-1">
                <p
                  v-for="entry in expenseBreakdown"
                  :key="entry.currency"
                  class="font-mono text-sm font-semibold text-accent-red"
                >
                  {{ formatCurrency(entry.amount, entry.currency) }}
                </p>
              </div>
            </div>
          </div>

          <div class="rounded-base bg-bg-primary px-3 py-2 text-xs text-text-muted">
            {{ valuationMessage }}
          </div>
        </div>

        <!-- Bottom: Mixed bar+line chart (expenses bars + balance line) -->
        <div v-if="canShowCombinedTrend" class="app-chart-surface rounded-base bg-bg-primary p-4">
          <p class="mb-1 text-xs font-medium tracking-wider text-text-muted">
            EXPENSES &amp; BALANCE TREND
          </p>
          <LineBarChart
            :bar-data="barData"
            :line-data="lineData"
            bar-label="Expenses"
            line-label="Balance"
            bar-color="#e8c468"
            line-color="#4ade80"
            height="210"
          />
        </div>
        <div v-else class="rounded-base bg-bg-primary p-4 text-xs text-text-muted">
          Trend charts stay hidden while this period mixes native currencies. Add valuation coverage before showing an estimated combined trend.
        </div>
      </div>

      <!-- Right card: Next Month Projections -->
      <div
        class="rounded-base border border-border-default bg-bg-card p-5"
      >
        <div class="mb-4 flex items-center gap-2">
          <span class="flex h-5 w-5 items-center justify-center rounded-full bg-accent-gold/20 text-xs text-accent-gold">&#8593;</span>
          <h3 class="text-sm font-medium text-text-primary">
            Next Month Projections
          </h3>
        </div>

        <!-- Estimated Burn -->
        <div class="mb-4">
          <div class="mb-1 flex justify-between">
            <span class="text-xs font-medium tracking-wider text-text-muted">
              ESTIMATED BURN
            </span>
            <span class="font-mono text-xs text-text-primary">
              {{ primaryExpense ? formatCurrency(primaryExpense.amount, primaryExpense.currency) : 'Native only' }}
            </span>
          </div>
          <ProgressBar
            :value="burnPercent"
            :max="100"
            color="bg-accent-orange"
          />
        </div>

        <!-- Recurring Commitment -->
        <div class="mb-4">
          <div class="mb-1 flex justify-between">
            <span class="text-xs font-medium tracking-wider text-text-muted">
              RECURRING COMMITMENT
            </span>
            <span class="font-mono text-xs text-text-primary">
              {{ primaryIncome ? formatCurrency(recurringTotal, primaryIncome.currency) : formatCurrency(recurringTotal) }}
            </span>
          </div>
          <ProgressBar
            :value="recurringPercent"
            :max="100"
            color="bg-accent-blue"
          />
        </div>

        <!-- Projected Savings Insight -->
        <InsightCard title="Projected Savings" :message="projectedSavingsMsg" severity="success" />
      </div>
    </template>
  </div>
</template>
