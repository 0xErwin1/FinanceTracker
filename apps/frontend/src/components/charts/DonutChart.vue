<script setup lang="ts">
import { computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { chartTheme } from '@/utils/chartTheme';
import type { CategorySplit } from '@/types';

interface Props {
  categories: CategorySplit[];
  centerLabel?: string;
  centerValue?: string;
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  centerLabel: undefined,
  centerValue: undefined,
  height: '280',
});

const chartOptions = computed(() => ({
  ...chartTheme,
  chart: {
    ...chartTheme.chart,
    type: 'donut' as const,
  },
  labels: props.categories.map((c) => c.category),
  colors:
    props.categories.map((c) => c.color).filter(Boolean) ||
    chartTheme.colors,
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: !!props.centerLabel,
          name: {
            show: true,
            color: '#94a3b8',
            fontFamily: "'Space Grotesk', sans-serif",
          },
          value: {
            show: true,
            color: '#e2e8f0',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '20px',
          },
          total: {
            show: !!props.centerValue,
            label: props.centerLabel ?? '',
            color: '#94a3b8',
            formatter: () => props.centerValue ?? '',
          },
        },
      },
    },
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    show: false,
  },
  legend: {
    ...chartTheme.legend,
    position: 'bottom' as const,
  },
}));
</script>

<template>
  <div class="w-full">
    <VueApexCharts
      type="donut"
      :options="chartOptions"
      :series="categories.map((c) => c.amount)"
      :height="height"
    />
  </div>
</template>
