<script setup lang="ts">
import { formatCurrency } from '@/utils/format';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

interface Props {
  columns: Column[];
  rows: Record<string, unknown>[];
}

defineProps<Props>();

const emit = defineEmits<{
  rowClick: [row: Record<string, unknown>];
}>();

function getAlign(align?: 'left' | 'center' | 'right'): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}
</script>

<template>
  <div class="overflow-x-auto rounded-base border border-border-default">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-border-default bg-bg-card">
          <th
            v-for="col in columns"
            :key="col.key"
            :class="[
              getAlign(col.align),
              'px-4 py-3 text-xs font-medium uppercase tracking-wider text-text-muted',
            ]"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="(row, index) in rows"
          :key="index"
          class="cursor-pointer border-b border-border-default/50 transition-colors last:border-b-0 hover:bg-bg-card-hover"
          @click="emit('rowClick', row)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :class="[
              getAlign(col.align),
              'px-4 py-3 text-text-primary',
            ]"
          >
            <slot :name="col.key" :value="row[col.key]" :row="row">
              {{ row[col.key] }}
            </slot>
          </td>
        </tr>

        <tr v-if="rows.length === 0">
          <td
            :colspan="columns.length"
            class="px-4 py-8 text-center text-text-muted"
          >
            No data available
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
