<script setup lang="ts">
import { Search } from 'lucide-vue-next';

interface CategoryOption {
  id: string;
  name: string;
}

interface Props {
  searchFilter: string;
  typeFilter: string;
  categoryFilter: string;
  dateFrom: string;
  dateTo: string;
  categories: CategoryOption[];
}

defineProps<Props>();

const emit = defineEmits<{
  'update:searchFilter': [value: string];
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
    class="rounded-base border border-border-default bg-bg-card p-4 sm:p-5"
  >
    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
      <div class="grid gap-4 shell:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <!-- Search -->
        <div class="flex flex-col gap-1.5 shell:col-span-2 xl:col-span-1">
          <label for="filter-search" class="text-xs font-medium text-text-muted">
            Search
          </label>

          <div
            class="flex items-center gap-2 rounded-base border border-border-default bg-bg-primary px-3 py-2"
          >
            <Search :size="16" class="shrink-0 text-text-muted" />
            <input
              id="filter-search"
              :value="searchFilter"
              type="text"
              placeholder="Search note or category..."
              class="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
              @input="emit('update:searchFilter', ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>

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
        <div class="flex flex-col gap-1.5 shell:col-span-2 xl:col-span-1">
          <span class="text-xs font-medium text-text-muted">Date Range</span>

          <div class="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
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

            <span class="hidden text-center text-text-muted sm:block">—</span>

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
      </div>

      <!-- Action buttons -->
      <div class="flex flex-col gap-2 sm:flex-row xl:justify-end">
        <button
          type="button"
          class="w-full rounded-base border border-border-default bg-bg-card px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card-hover sm:w-auto"
          @click="emit('export')"
        >
          Export
        </button>

        <button
          type="button"
          class="w-full rounded-base bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-gold/90 sm:w-auto"
          @click="emit('addTransaction')"
        >
          Add Transaction
        </button>
      </div>
    </div>
  </div>
</template>
