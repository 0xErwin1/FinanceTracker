<script setup lang="ts">
import { computed } from 'vue';
import VueApexCharts from 'vue3-apexcharts';
import type { ChartDataPoint } from '@/types';
import { chartTheme } from '@/utils/chartTheme';

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
    parentHeightOffset: 0,
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
      type="bar"
      :options="chartOptions"
      :series="[{ name: label ?? 'Value', data: data.map((d) => d.value) }]"
      :height="height"
    />
  </div>
</template>
