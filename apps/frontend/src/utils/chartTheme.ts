import type { ApexOptions } from 'apexcharts';

/**
 * Shared ApexCharts dark theme configuration.
 * Apply via `const options = { ...chartTheme, ...overrides }`.
 */
export const chartTheme: ApexOptions = {
  chart: {
    background: 'transparent',
    toolbar: { show: false },
    fontFamily: "'Space Grotesk', sans-serif",
  },
  theme: { mode: 'dark' },
  colors: ['#e8c468', '#564338', '#8b6914', '#d4a843', '#3d2e1f'],
  grid: {
    borderColor: '#1e293b',
    strokeDashArray: 4,
  },
  tooltip: {
    theme: 'dark',
    style: {
      fontFamily: "'Space Grotesk', sans-serif",
    },
  },
  legend: {
    labels: {
      colors: '#94a3b8',
    },
  },
  xaxis: {
    labels: {
      style: {
        colors: '#94a3b8',
        fontFamily: "'Space Grotesk', sans-serif",
      },
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: {
        colors: '#94a3b8',
        fontFamily: "'Space Grotesk', sans-serif",
      },
    },
  },
};
