<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title?: string;
  description?: string;
  columns?: 1 | 2 | 3;
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  description: undefined,
  columns: 1,
});

const gridClass = computed(() => {
  if (props.columns === 3) {
    return 'grid-cols-1 gap-4 shell:grid-cols-2 xl:grid-cols-3';
  }

  if (props.columns === 2) {
    return 'grid-cols-1 gap-4 shell:grid-cols-2';
  }

  return 'grid-cols-1 gap-4';
});
</script>

<template>
  <section class="rounded-base border border-border-default bg-bg-card">
    <header
      v-if="title || description"
      class="border-b border-border-default px-4 py-4 sm:px-5"
    >
      <h2 v-if="title" class="text-base font-semibold text-text-primary">
        {{ title }}
      </h2>

      <p v-if="description" class="mt-1 text-sm text-text-secondary">
        {{ description }}
      </p>
    </header>

    <div class="px-4 py-4 sm:px-5">
      <div class="grid" :class="gridClass">
        <slot />
      </div>
    </div>

    <footer
      v-if="$slots.actions"
      class="border-t border-border-default px-4 py-4 sm:px-5"
    >
      <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <slot name="actions" />
      </div>
    </footer>
  </section>
</template>
