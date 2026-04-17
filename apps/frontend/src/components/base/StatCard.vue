<script setup lang="ts">
interface Props {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    percentage: number;
  };
}

defineProps<Props>();
</script>

<template>
  <div
    class="rounded-base border border-border-default bg-bg-card p-5 transition-colors hover:bg-bg-card-hover"
  >
    <p class="text-sm text-text-secondary">{{ title }}</p>

    <p class="mt-2 font-mono text-2xl font-semibold text-text-primary">
      {{ value }}
    </p>

    <div v-if="subtitle || trend" class="mt-2 flex items-center gap-2">
      <span
        v-if="trend"
        :class="[
          'text-xs font-medium',
          trend.direction === 'up'
            ? 'text-accent-green'
            : trend.direction === 'down'
              ? 'text-accent-red'
              : 'text-text-muted',
        ]"
      >
        {{ trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''
        }}{{ Math.abs(trend.percentage).toFixed(1) }}%
      </span>

      <span v-if="subtitle" class="text-xs text-text-muted">
        {{ subtitle }}
      </span>
    </div>
  </div>
</template>
