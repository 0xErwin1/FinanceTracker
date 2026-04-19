<script setup lang="ts">
import { computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import type { ChartDataPoint } from '@/types';
import { chartTheme } from '@/utils/chartTheme';

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
    parentHeightOffset: 0,
  },
  colors: [props.lineColor, props.barColor],
  legend: {
    ...chartTheme.legend,
    position: 'bottom' as const,
  },
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
  responsive: [
    {
      breakpoint: 640,
      options: {
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
}));
</script>

<template>
  <div class="app-chart-surface min-w-0 w-full">
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
