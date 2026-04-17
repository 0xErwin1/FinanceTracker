<script setup lang="ts">
import { computed } from 'vue';
import type { ChartDataPoint, MonthlyData, DailyData } from '@/types';
import LineBarChart from '@/components/charts/LineBarChart.vue';
import ProgressBar from '@/components/base/ProgressBar.vue';
import InsightCard from '@/components/base/InsightCard.vue';
import { formatCurrency } from '@/utils/format';

interface Props {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  netSavingsByCurrency: Record<string, number>;
  monthlyVelocity: ChartDataPoint[];
  monthlyIncomeExpenses: MonthlyData[];
  currentMonthDaily: DailyData[];
  recurringTotal: number;
  loading: boolean;
}

const props = defineProps<Props>();

const burnPercent = computed(() => {
  if (props.totalIncome <= 0) return 0;
  return (props.totalExpenses / props.totalIncome) * 100;
});

const recurringPercent = computed(() => {
  if (props.totalIncome <= 0) return 0;
  return (props.recurringTotal / props.totalIncome) * 100;
});

const projectedSavingsMsg = computed(() => {
  if (props.totalIncome <= 0) return 'Insufficient data';
  const rate = ((props.netSavings / props.totalIncome) * 100).toFixed(0);
  return `+${rate}% savings rate this period`;
});

const secondaryCurrencies = computed(() =>
  Object.entries(props.netSavingsByCurrency)
    .filter(([code]) => code !== 'USD')
    .map(([code, amount]) => ({ code, amount })),
);

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
  <div class="grid grid-cols-[2fr_1fr] gap-4">
    <!-- Loading skeleton -->
    <template v-if="loading">
      <div class="animate-pulse rounded-base border border-border-default bg-bg-card p-5">
        <div class="h-4 w-32 rounded bg-bg-primary mb-4" />
        <div class="flex gap-3 mb-4">
          <div class="h-14 w-28 rounded-base bg-bg-primary" />
          <div class="h-14 w-28 rounded-base bg-bg-primary" />
        </div>
        <div class="grid grid-cols-[auto_1fr] gap-4">
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
        <div class="mb-4 flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <h3 class="text-sm font-medium text-text-secondary">
              Current Period
            </h3>

            <!-- Compact Net Savings -->
            <div class="rounded-base bg-bg-primary px-3 py-1.5">
              <p class="text-[10px] font-medium tracking-wider text-text-muted">
                NET SAVINGS
              </p>
              <p class="font-mono text-lg font-bold text-text-primary">
                {{ formatCurrency(netSavings) }}
              </p>
              <div v-if="secondaryCurrencies.length > 0" class="space-y-0">
                <p
                  v-for="{ code, amount } in secondaryCurrencies"
                  :key="code"
                  class="font-mono text-[10px] text-text-muted"
                >
                  {{ code }}: {{ formatCurrency(amount, code) }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <div class="rounded-base bg-bg-primary px-3 py-2">
              <p class="text-xs text-text-muted">Income</p>
              <p class="font-mono text-sm font-semibold text-accent-green">
                {{ formatCurrency(totalIncome) }}
              </p>
            </div>
            <div class="rounded-base bg-bg-primary px-3 py-2">
              <p class="text-xs text-text-muted">Expenses</p>
              <p class="font-mono text-sm font-semibold text-accent-red">
                {{ formatCurrency(totalExpenses) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Bottom: Mixed bar+line chart (expenses bars + balance line) -->
        <div class="rounded-base bg-bg-primary p-4">
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
              {{ formatCurrency(totalExpenses) }}
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
              {{ formatCurrency(recurringTotal) }}
            </span>
          </div>
          <ProgressBar
            :value="recurringPercent"
            :max="100"
            color="bg-accent-blue"
          />
        </div>

        <!-- Projected Savings Insight -->
        <InsightCard
          title="Projected Savings"
          :message="projectedSavingsMsg"
          severity="success"
        />
      </div>
    </template>
  </div>
</template>
