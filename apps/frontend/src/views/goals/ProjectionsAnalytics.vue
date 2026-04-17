<script setup lang="ts">
import { computed } from 'vue';
import BarChart from '@/components/charts/BarChart.vue';
import { formatCurrency } from '@/utils/format';
import type { ChartDataPoint } from '@/types';

interface GoalItem {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  currency: string;
  targetDate: string;
  [key: string]: unknown;
}

interface Props {
  goal: GoalItem | null;
  loading: boolean;
}

const props = defineProps<Props>();

/** 12-month projection using linear interpolation from current pace. */
const projectionData = computed<ChartDataPoint[]>(() => {
  if (!props.goal || props.goal.targetAmount <= 0) return [];

  const now = new Date();
  const target = new Date(props.goal.targetDate);
  const totalMonths = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());

  const monthlyRate =
    totalMonths > 0 ? Math.max((props.goal.targetAmount - props.goal.currentAmount) / totalMonths, 0) : 0;

  const months: ChartDataPoint[] = [];
  let accumulated = props.goal.currentAmount;

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = d.toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });

    accumulated = Math.min(accumulated + monthlyRate, props.goal.targetAmount);

    months.push({
      label,
      value: Math.round(accumulated * 100) / 100,
    });
  }

  return months;
});

const projectedTotal = computed(() => {
  const data = projectionData.value;
  if (data.length === 0) return 0;
  return data[data.length - 1].value;
});

const targetAmount = computed(() => props.goal?.targetAmount ?? 0);
</script>

<template>
  <div class="rounded-base border border-border-default bg-bg-card p-5">
    <template v-if="loading">
      <div class="animate-pulse space-y-4">
        <div class="h-4 w-48 rounded bg-bg-primary" />
        <div class="flex gap-3">
          <div class="h-14 w-32 rounded-base bg-bg-primary" />
          <div class="h-14 w-32 rounded-base bg-bg-primary" />
        </div>
        <div class="h-56 w-full rounded-base bg-bg-primary" />
      </div>
    </template>

    <template v-else>
      <!-- Header -->
      <div class="mb-4">
        <h3 class="text-sm font-medium text-text-primary">
          Projections & Analytics
        </h3>
        <p class="text-xs text-text-muted">
          12-month savings trajectory based on current pace
        </p>
      </div>

      <!-- Metric cards -->
      <div class="mb-4 flex gap-3">
        <div class="rounded-base bg-bg-primary px-3 py-2">
          <p class="text-xs text-text-muted">Projected</p>
          <p class="font-mono text-sm font-semibold text-accent-green">
            {{ formatCurrency(projectedTotal, goal?.currency ?? 'USD') }}
          </p>
        </div>
        <div class="rounded-base bg-bg-primary px-3 py-2">
          <p class="text-xs text-text-muted">Target</p>
          <p class="font-mono text-sm font-semibold text-accent-gold">
            {{ formatCurrency(targetAmount, goal?.currency ?? 'USD') }}
          </p>
        </div>
      </div>

      <!-- Bar chart -->
      <BarChart
        v-if="projectionData.length > 0"
        :data="projectionData"
        label="Projected Balance"
        color="#4ade80"
        height="280"
      />

      <div
        v-else
        class="flex h-56 items-center justify-center text-xs text-text-muted"
      >
        No projection data available
      </div>
    </template>
  </div>
</template>
