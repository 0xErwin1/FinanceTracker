<script setup lang="ts">
import ResponsiveDataList from './ResponsiveDataList.vue';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

interface Props {
  columns: Column[];
  rows: Record<string, unknown>[];
  mobileMode?: 'cards' | 'scroll';
  cardTitleKey?: string;
  cardSubtitleKey?: string;
  emptyMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  mobileMode: 'scroll',
  cardTitleKey: undefined,
  cardSubtitleKey: undefined,
  emptyMessage: 'No data available',
});

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
  <div v-if="props.mobileMode === 'cards'" class="space-y-3 shell:hidden">
    <ResponsiveDataList
      :columns="props.columns"
      :rows="props.rows"
      :card-title-key="props.cardTitleKey"
      :card-subtitle-key="props.cardSubtitleKey"
      :empty-message="props.emptyMessage"
      @row-click="emit('rowClick', $event)"
    >
      <template v-for="column in props.columns" :key="column.key" #[column.key]="slotProps">
        <slot :name="column.key" v-bind="slotProps">
          {{ slotProps.value }}
        </slot>
      </template>
    </ResponsiveDataList>
  </div>

  <div
    class="app-safe-scroll-x rounded-base border border-border-default"
    :class="props.mobileMode === 'cards' ? 'hidden shell:block' : ''"
  >
    <table class="w-full min-w-[640px] text-sm shell:min-w-0">
      <thead>
        <tr class="border-b border-border-default bg-bg-card">
          <th
            v-for="col in props.columns"
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
          v-for="(row, index) in props.rows"
          :key="index"
          class="cursor-pointer border-b border-border-default/50 transition-colors last:border-b-0 hover:bg-bg-card-hover"
          @click="emit('rowClick', row)"
        >
          <td
            v-for="col in props.columns"
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

        <tr v-if="props.rows.length === 0">
          <td
            :colspan="props.columns.length"
            class="px-4 py-8 text-center text-text-muted"
          >
            {{ props.emptyMessage }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
