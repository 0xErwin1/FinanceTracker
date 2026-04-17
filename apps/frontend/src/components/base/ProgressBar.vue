<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  value: number;
  max: number;
  color?: string;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  color: 'bg-accent-green',
  label: undefined,
});

const percentage = computed(() => {
  if (props.max <= 0) return 0;
  return Math.min((props.value / props.max) * 100, 100);
});
</script>

<template>
  <div class="w-full">
    <div v-if="label" class="mb-1 flex items-center justify-between">
      <span class="text-xs text-text-secondary">{{ label }}</span>
      <span class="font-mono text-xs text-text-muted">
        {{ percentage.toFixed(0) }}%
      </span>
    </div>

    <div class="h-1.5 w-full overflow-hidden rounded-full bg-bg-primary">
      <div
        :class="[color, 'h-full rounded-full transition-all duration-500 ease-out']"
        :style="{ width: `${percentage}%` }"
      />
    </div>
  </div>
</template>
