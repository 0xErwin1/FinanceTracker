<script setup lang="ts">
import { computed } from 'vue';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

interface Props {
  columns: Column[];
  rows: Record<string, unknown>[];
  cardTitleKey?: string;
  cardSubtitleKey?: string;
  emptyMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  cardTitleKey: undefined,
  cardSubtitleKey: undefined,
  emptyMessage: 'No data available',
});

const emit = defineEmits<{
  rowClick: [row: Record<string, unknown>];
}>();

const titleKey = computed(() => props.cardTitleKey ?? props.columns[0]?.key ?? '');
const subtitleKey = computed(() => props.cardSubtitleKey ?? '');

function visibleColumns(row: Record<string, unknown>) {
  return props.columns.filter((column) => {
    if (column.key === titleKey.value || column.key === subtitleKey.value) {
      return false;
    }

    return row[column.key] !== undefined;
  });
}
</script>

<template>
  <div class="space-y-3">
    <button
      v-for="(row, index) in rows"
      :key="index"
      type="button"
      class="flex w-full flex-col gap-3 rounded-base border border-border-default bg-bg-card p-4 text-left transition-colors hover:bg-bg-card-hover"
      @click="emit('rowClick', row)"
    >
      <div class="space-y-1">
        <p class="text-sm font-semibold text-text-primary">
          <slot :name="titleKey" :value="row[titleKey]" :row="row">
            {{ row[titleKey] }}
          </slot>
        </p>

        <p v-if="subtitleKey && row[subtitleKey] !== undefined" class="text-xs text-text-secondary">
          <slot :name="subtitleKey" :value="row[subtitleKey]" :row="row">
            {{ row[subtitleKey] }}
          </slot>
        </p>
      </div>

      <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div v-for="column in visibleColumns(row)" :key="column.key" class="space-y-1">
          <dt class="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            {{ column.label }}
          </dt>
          <dd class="text-sm text-text-primary">
            <slot :name="column.key" :value="row[column.key]" :row="row">
              {{ row[column.key] }}
            </slot>
          </dd>
        </div>
      </dl>
    </button>

    <div
      v-if="rows.length === 0"
      class="rounded-base border border-border-default bg-bg-card px-4 py-8 text-center text-sm text-text-muted"
    >
      {{ emptyMessage }}
    </div>
  </div>
</template>
