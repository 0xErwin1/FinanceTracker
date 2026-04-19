<script setup lang="ts">
import { computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import type { ChartDataPoint } from '@/types';
import { chartTheme } from '@/utils/chartTheme';

interface Props {
  monthlySpent: ChartDataPoint[];
  totalBudget: number;
  loading: boolean;
}

const props = defineProps<Props>();

/** Grouped bar chart options showing budgeted vs actual spending. */
const chartOptions = computed(() => {
  const months = props.monthlySpent.map((d) => {
    const [year, month] = d.label.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short' });
  });

  return {
    ...chartTheme,
    chart: {
      ...chartTheme.chart,
      type: 'bar' as const,
      parentHeightOffset: 0,
    },
    colors: ['#e8c468', '#564338'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '55%',
        dataLabels: { position: 'top' as const },
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      ...chartTheme.xaxis,
      categories: months,
    },
    yaxis: {
      labels: {
        style: {
          colors: '#94a3b8',
          fontFamily: "'Space Grotesk', sans-serif",
        },
        formatter: (val: number) => val.toFixed(0),
      },
    },
    legend: {
      ...chartTheme.legend,
      show: true,
      position: 'top' as const,
      horizontalAlign: 'right' as const,
      markers: { size: 8, shape: 'circle' as const },
    },
    responsive: [
      {
        breakpoint: 640,
        options: {
          legend: {
            position: 'bottom' as const,
            horizontalAlign: 'left' as const,
          },
          plotOptions: {
            bar: {
              columnWidth: '72%',
            },
          },
          xaxis: {
            labels: {
              rotate: -45,
              hideOverlappingLabels: true,
            },
          },
        },
      },
    ],
    tooltip: {
      ...chartTheme.tooltip,
      y: {
        formatter: (val: number) => `$${val.toLocaleString()}`,
      },
    },
  };
});

const chartSeries = computed(() => [
  {
    name: 'Budget',
    data: props.monthlySpent.map(() => props.totalBudget),
  },
  {
    name: 'Spent',
    data: props.monthlySpent.map((d) => d.value),
  },
]);
</script>

<template>
  <div
    class="rounded-base border border-border-default bg-bg-card p-5"
  >
    <!-- Loading skeleton -->
    <div v-if="loading" class="animate-pulse">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2">
          <div class="h-5 w-5 rounded bg-bg-primary" />
          <div class="h-4 w-32 rounded bg-bg-primary" />
        </div>
        <div class="flex items-center gap-3">
          <div class="h-3 w-16 rounded bg-bg-primary" />
          <div class="h-3 w-16 rounded bg-bg-primary" />
        </div>
      </div>
      <div class="h-56 rounded-base bg-bg-primary" />
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Header with icon + title + legend -->
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="flex h-5 w-5 items-center justify-center rounded bg-accent-gold/20 text-xs text-accent-gold">
            &#9632;
          </span>
          <h3 class="text-sm font-medium text-text-primary">
            Spending History
          </h3>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <span class="flex items-center gap-1.5 text-xs text-text-muted">
            <span class="inline-block h-2 w-2 rounded-full bg-accent-gold" />
            Budget
          </span>
          <span class="flex items-center gap-1.5 text-xs text-text-muted">
            <span class="inline-block h-2 w-2 rounded-full bg-[#564338]" />
            Spent
          </span>
        </div>
      </div>

      <!-- Grouped bar chart -->
      <div class="app-chart-surface min-w-0">
        <VueApexCharts
          type="bar"
          :options="chartOptions"
          :series="chartSeries"
          height="240"
        />
      </div>
    </template>
  </div>
</template>
