<script setup lang="ts">
type InsightVariant = 'info' | 'success' | 'warning';

interface Props {
  title: string;
  message: string;
  severity?: InsightVariant;
}

const props = withDefaults(defineProps<Props>(), {
  severity: 'info',
});

const variantStyles: Record<InsightVariant, string> = {
  info: 'border-accent-blue/40 bg-accent-blue/5',
  success: 'border-accent-green/40 bg-accent-green/5',
  warning: 'border-accent-orange/40 bg-accent-orange/5',
};

const iconColors: Record<InsightVariant, string> = {
  info: 'text-accent-blue',
  success: 'text-accent-green',
  warning: 'text-accent-orange',
};

const icons: Record<InsightVariant, string> = {
  info: 'i',
  success: '\u2713',
  warning: '!',
};
</script>

<template>
  <div :class="['rounded-base border p-4', variantStyles[props.severity]]">
    <div class="flex items-start gap-3">
      <span
        :class="[
          iconColors[props.severity],
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/20 text-xs font-bold',
        ]"
      >
        {{ icons[props.severity] }}
      </span>

      <div>
        <p class="text-sm font-medium text-text-primary">{{ title }}</p>
        <p class="mt-1 text-xs text-text-secondary">{{ message }}</p>
      </div>
    </div>
  </div>
</template>
