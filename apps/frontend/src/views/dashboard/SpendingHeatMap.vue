<script setup lang="ts">
import HeatmapCalendar from '@/components/charts/HeatmapCalendar.vue';
import type { HeatmapDay } from '@/types';

interface Props {
  heatmapData: HeatmapDay[];
  loading: boolean;
}

defineProps<Props>();

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
</script>

<template>
  <div
    class="rounded-base border border-border-default bg-bg-card p-4"
  >
    <!-- Loading skeleton -->
    <div v-if="loading" class="animate-pulse space-y-2">
      <div class="h-3 w-36 rounded bg-bg-primary" />
      <div class="grid grid-cols-7 gap-0.5">
        <div
          v-for="i in 35"
          :key="i"
          class="aspect-square rounded-sm bg-bg-primary"
        />
      </div>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Section header -->
      <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 class="text-xs font-medium text-text-primary">
          Spending Heat Map
        </h3>

        <div class="flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
          <div class="flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-accent-green/30" />
            <span>Low</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-accent-orange/40" />
            <span>Mid</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-accent-red/50" />
            <span>High</span>
          </div>
        </div>
      </div>

      <HeatmapCalendar
        :year="currentYear"
        :month="currentMonth"
        :data="heatmapData"
      />
    </template>
  </div>
</template>
