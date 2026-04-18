<script setup lang="ts">
interface FilterOption {
  value: string;
  label: string;
}

interface Filter {
  key: string;
  label: string;
  options: FilterOption[];
  modelValue: string;
}

interface Props {
  filters: Filter[];
  stackOnMobile?: boolean;
  wrapActions?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  stackOnMobile: false,
  wrapActions: true,
});

const emit = defineEmits<{
  'update:filter': [key: string, value: string];
}>();
</script>

<template>
  <div
    :class="[
      'gap-3',
      props.stackOnMobile
        ? 'grid grid-cols-1 shell:flex shell:flex-wrap shell:items-end'
        : 'flex flex-wrap items-center',
    ]"
  >
    <div
      v-for="filter in filters"
      :key="filter.key"
      class="flex min-w-0 flex-col gap-1.5 shell:flex-row shell:items-center shell:gap-2"
    >
      <label
        :for="`filter-${filter.key}`"
        class="text-xs font-medium text-text-muted"
      >
        {{ filter.label }}
      </label>

      <select
        :id="`filter-${filter.key}`"
        :value="filter.modelValue"
        class="min-w-0 rounded-base border border-border-default bg-bg-card px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent-gold"
        @change="
          emit('update:filter', filter.key, ($event.target as HTMLSelectElement).value)
        "
      >
        <option
          v-for="option in filter.options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>

    <div
      v-if="$slots.actions"
      :class="[
        'flex gap-2 shell:ml-auto',
        props.wrapActions ? 'flex-wrap' : 'flex-nowrap',
        props.stackOnMobile ? 'flex-col sm:flex-row' : 'items-center',
      ]"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
