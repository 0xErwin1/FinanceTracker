<script setup lang="ts">
import type { InstallmentPlanDTO } from '@expenses/api';
import { computed } from 'vue';
import { buildBottomMetricsCards } from './bottomMetrics';

interface Props {
  plans: InstallmentPlanDTO[];
  totalRemaining: number;
  loading: boolean;
}

const props = defineProps<Props>();

// biome-ignore lint/correctness/noUnusedVariables: Vue template consumes this computed binding.
const metricCards = computed(() => buildBottomMetricsCards(props.plans, props.totalRemaining));
</script>

<template>
  <section>
    <!-- Loading skeleton -->
    <div
      v-if="loading"
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div
        v-for="i in 4"
        :key="i"
        class="animate-pulse rounded-base border border-border-default bg-bg-card p-3"
      >
        <div class="h-3 w-16 rounded bg-bg-primary mb-1.5" />
        <div class="h-5 w-20 rounded bg-bg-primary" />
      </div>
    </div>

    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in metricCards"
        :key="card.label"
        class="rounded-base border border-border-default bg-bg-card p-3"
      >
        <p class="text-[10px] font-medium tracking-wider text-text-muted">
          {{ card.label }}
        </p>
        <p class="mt-0.5 font-mono text-base font-semibold text-text-primary">
          {{ card.value }}
        </p>
      </div>
    </div>
  </section>
</template>
