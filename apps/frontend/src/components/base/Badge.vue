<script setup lang="ts">
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface Props {
  text: string;
  variant?: BadgeVariant;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
});

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-accent-green/15 text-accent-green',
  warning: 'bg-accent-orange/15 text-accent-orange',
  danger: 'bg-accent-red/15 text-accent-red',
  info: 'bg-accent-blue/15 text-accent-blue',
  default: 'bg-text-muted/15 text-text-muted',
};
</script>

<template>
  <span
    :class="[
      variantClasses[props.variant],
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
    ]"
  >
    {{ text }}
  </span>
</template>
