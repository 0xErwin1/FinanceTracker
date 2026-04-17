<script setup lang="ts">
import { computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { chartTheme } from '@/utils/chartTheme';
import type { ChartDataPoint } from '@/types';

interface Props {
  data: ChartDataPoint[];
  label?: string;
  color?: string;
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  color: '#e8c468',
  height: '240',
});

const chartOptions = computed(() => ({
  ...chartTheme,
  chart: {
    ...chartTheme.chart,
    type: 'bar' as const,
  },
  colors: [props.color],
  plotOptions: {
    bar: {
      borderRadius: 4,
      columnWidth: '60%',
    },
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    ...chartTheme.xaxis,
    categories: props.data.map((d) => d.label),
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
}));
</script>

<template>
  <div class="w-full">
    <VueApexCharts
      type="bar"
      :options="chartOptions"
      :series="[{ name: label ?? 'Value', data: data.map((d) => d.value) }]"
      :height="height"
    />
  </div>
</template>
