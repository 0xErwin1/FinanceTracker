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
}

defineProps<Props>();

const emit = defineEmits<{
  'update:filter': [key: string, value: string];
}>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <div v-for="filter in filters" :key="filter.key" class="flex items-center gap-2">
      <label
        :for="`filter-${filter.key}`"
        class="text-xs font-medium text-text-muted"
      >
        {{ filter.label }}
      </label>

      <select
        :id="`filter-${filter.key}`"
        :value="filter.modelValue"
        class="rounded-base border border-border-default bg-bg-card px-3 py-1.5 text-sm text-text-primary outline-none transition-colors focus:border-accent-gold"
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
  </div>
</template>
