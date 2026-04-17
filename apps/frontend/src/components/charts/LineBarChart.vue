<script setup lang="ts">
import { computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import { chartTheme } from '@/utils/chartTheme';
import type { ChartDataPoint } from '@/types';

interface Props {
  lineData: ChartDataPoint[];
  barData: ChartDataPoint[];
  lineLabel?: string;
  barLabel?: string;
  lineColor?: string;
  barColor?: string;
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  lineLabel: 'Projected',
  barLabel: 'Actual',
  lineColor: '#e8c468',
  barColor: '#564338',
  height: '240',
});

const chartOptions = computed(() => ({
  ...chartTheme,
  chart: {
    ...chartTheme.chart,
    type: 'line' as const,
  },
  colors: [props.lineColor, props.barColor],
  stroke: {
    width: [2, 0],
    curve: 'smooth' as const,
  },
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
    categories: props.lineData.map((d) => d.label),
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
      type="line"
      :options="chartOptions"
      :series="[
        { name: lineLabel, type: 'line', data: lineData.map((d) => d.value) },
        { name: barLabel, type: 'bar', data: barData.map((d) => d.value) },
      ]"
      :height="height"
    />
  </div>
</template>
