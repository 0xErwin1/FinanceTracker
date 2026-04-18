<script setup lang="ts">
import { computed } from 'vue';
import type { HeatmapDay } from '@/types';

interface Props {
  year: number;
  month: number; // 1-12
  data: HeatmapDay[];
}

const props = defineProps<Props>();

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Build a lookup from date string to amount for fast access. */
const dataMap = computed(() => {
  const map = new Map<string, number>();
  for (const day of props.data) {
    map.set(day.date, day.amount);
  }
  return map;
});

/** Maximum spending amount in the dataset, used for intensity scaling. */
const maxAmount = computed(() => {
  const amounts = props.data.map((d) => d.amount).filter((a) => a > 0);
  return amounts.length > 0 ? Math.max(...amounts) : 0;
});

interface CalendarCell {
  day: number | null;
  dateStr: string | null;
  amount: number;
}

/**
 * Generate the 7x5 grid for the given month.
 * Weeks start on Monday. Leading/trailing cells are null.
 * Uses 5 rows instead of 6 to keep the layout compact.
 */
const grid = computed<CalendarCell[]>(() => {
  const firstDay = new Date(props.year, props.month - 1, 1);
  const lastDay = new Date(props.year, props.month, 0);
  const totalDays = lastDay.getDate();

  // getDay() returns 0=Sunday, convert to Monday-based (0=Monday)
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const cells: CalendarCell[] = [];
  const totalCells = 35; // 7 cols x 5 rows (compact)

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > totalDays) {
      cells.push({ day: null, dateStr: null, amount: 0 });
    } else {
      const dateStr = `${props.year}-${String(props.month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        day: dayNum,
        dateStr,
        amount: dataMap.value.get(dateStr) ?? 0,
      });
    }
  }

  return cells;
});

/** Return background intensity class based on spending amount. */
function cellBgClass(amount: number): string {
  if (amount <= 0) return 'bg-bg-card/50';
  const ratio = maxAmount.value > 0 ? amount / maxAmount.value : 0;
  if (ratio < 0.33) return 'bg-accent-green/20';
  if (ratio < 0.66) return 'bg-accent-orange/30';
  return 'bg-accent-red/40';
}
</script>

<template>
  <div class="rounded-base border border-border-default bg-bg-card p-3">
    <!-- Header: month/year + legend -->
    <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h3 class="text-xs font-medium text-text-primary">
        {{
          new Date(year, month - 1).toLocaleString('en-US', {
            month: 'long',
            year: 'numeric',
          })
        }}
      </h3>

      <div class="flex flex-wrap items-center gap-1.5 text-[10px] text-text-muted">
        <span>Less</span>
        <span class="inline-block h-2.5 w-2.5 rounded-sm bg-bg-card/50" />
        <span class="inline-block h-2.5 w-2.5 rounded-sm bg-accent-green/20" />
        <span class="inline-block h-2.5 w-2.5 rounded-sm bg-accent-orange/30" />
        <span class="inline-block h-2.5 w-2.5 rounded-sm bg-accent-red/40" />
        <span>More</span>
      </div>
    </div>

    <!-- Day name headers -->
    <div class="mb-0.5 grid grid-cols-7 gap-0.5">
      <div
        v-for="name in DAY_NAMES"
        :key="name"
        class="text-center text-[10px] text-text-muted"
      >
        {{ name }}
      </div>
    </div>

    <!-- Calendar grid -->
    <div class="grid grid-cols-7 gap-0.5">
      <div
        v-for="(cell, index) in grid"
        :key="index"
        :class="[
          'flex aspect-square items-center justify-center rounded-sm text-[10px] leading-none transition-colors',
          cell.day === null
            ? 'bg-transparent'
            : cellBgClass(cell.amount),
          cell.day !== null ? 'text-text-secondary' : '',
          cell.amount > 0 ? 'font-medium text-text-primary' : '',
        ]"
        :title="
          cell.dateStr
            ? `${cell.dateStr}: ${cell.amount > 0 ? cell.amount.toFixed(0) : 'No spending'}`
            : ''
        "
      >
        {{ cell.day }}
      </div>
    </div>
  </div>
</template>
