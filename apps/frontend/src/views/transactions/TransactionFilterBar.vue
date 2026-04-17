<script setup lang="ts">
interface CategoryOption {
  id: string;
  name: string;
}

interface Props {
  typeFilter: string;
  categoryFilter: string;
  dateFrom: string;
  dateTo: string;
  categories: CategoryOption[];
}

defineProps<Props>();

const emit = defineEmits<{
  'update:typeFilter': [value: string];
  'update:categoryFilter': [value: string];
  'update:dateFrom': [value: string];
  'update:dateTo': [value: string];
  export: [];
  addTransaction: [];
}>();

const typeOptions = [
  { value: 'ALL', label: 'All Types' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
];

const selectClass =
  'rounded-base border border-border-default bg-bg-primary px-3 py-1.5 text-sm text-text-primary outline-none transition-colors focus:border-accent-gold';
</script>

<template>
  <div
    class="flex items-end gap-4 rounded-base border border-border-default bg-bg-card p-4"
  >
    <!-- Operation Type -->
    <div class="flex flex-col gap-1.5">
      <label for="filter-type" class="text-xs font-medium text-text-muted">
        Operation Type
      </label>

      <select
        id="filter-type"
        :value="typeFilter"
        :class="selectClass"
        @change="
          emit(
            'update:typeFilter',
            ($event.target as HTMLSelectElement).value,
          )
        "
      >
        <option
          v-for="opt in typeOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- Category -->
    <div class="flex flex-col gap-1.5">
      <label for="filter-category" class="text-xs font-medium text-text-muted">
        Category
      </label>

      <select
        id="filter-category"
        :value="categoryFilter"
        :class="selectClass"
        @change="
          emit(
            'update:categoryFilter',
            ($event.target as HTMLSelectElement).value,
          )
        "
      >
        <option value="">All Categories</option>

        <option v-for="cat in categories" :key="cat.id" :value="cat.id">
          {{ cat.name }}
        </option>
      </select>
    </div>

    <!-- Date Range -->
    <div class="flex flex-col gap-1.5">
      <span class="text-xs font-medium text-text-muted">Date Range</span>

      <div class="flex items-center gap-2">
        <input
          type="date"
          :value="dateFrom"
          :class="[selectClass, '[color-scheme:dark]']"
          @change="
            emit(
              'update:dateFrom',
              ($event.target as HTMLInputElement).value,
            )
          "
        />

        <span class="text-text-muted">—</span>

        <input
          type="date"
          :value="dateTo"
          :class="[selectClass, '[color-scheme:dark]']"
          @change="
            emit(
              'update:dateTo',
              ($event.target as HTMLInputElement).value,
            )
          "
        />
      </div>
    </div>

    <!-- Spacer -->
    <div class="flex-1" />

    <!-- Action buttons -->
    <div class="flex items-center gap-2">
      <button
        class="rounded-base border border-border-default bg-bg-card px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-card-hover"
        @click="emit('export')"
      >
        Export
      </button>

      <button
        class="rounded-base bg-accent-gold px-3 py-1.5 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-gold/90"
        @click="emit('addTransaction')"
      >
        Add Transaction
      </button>
    </div>
  </div>
</template>
