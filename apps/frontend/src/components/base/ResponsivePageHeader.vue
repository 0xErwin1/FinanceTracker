<script setup lang="ts">
interface Props {
  title: string;
  subtitle?: string;
  align?: 'start' | 'center';
}

withDefaults(defineProps<Props>(), {
  subtitle: undefined,
  align: 'start',
});
</script>

<template>
  <div
    :class="[
      'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
      align === 'center' ? 'sm:items-center' : '',
    ]"
  >
    <div class="min-w-0 space-y-1">
      <h1 class="text-xl font-semibold text-text-primary sm:text-2xl">
        {{ title }}
      </h1>

      <p v-if="subtitle" class="max-w-3xl text-sm text-text-secondary">
        {{ subtitle }}
      </p>
    </div>

    <div
      v-if="$slots.actions"
      class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
