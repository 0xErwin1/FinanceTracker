<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useRecurring } from '@/composables/useRecurring';
import { useCategories } from '@/composables/useCategories';
import { trpc } from '@/api/trpc';
import type { CategoryDTO } from '@expenses/api';
import { Repeat, Plus, Pause, Play, Trash2, Pencil, Check, X } from 'lucide-vue-next';
import { formatCurrency } from '@/utils/format';

const router = useRouter();
const { recurring, loading, error, refetch } = useRecurring();
const { categories: rawCategories } = useCategories();

const recurringList = computed(() => {
  const items = recurring.value;
  return Array.isArray(items) ? items : [];
});

const categoryMap = computed(() => {
  const items = rawCategories.value;
  if (!Array.isArray(items)) return new Map<string, string>();

  const map = new Map<string, string>();
  for (const cat of items) {
    const c = cat as CategoryDTO;
    if (c.id && c.name) map.set(c.id, c.name);
  }
  return map;
});

const activeCount = computed(() => recurringList.value.filter((r) => r.active).length);

// --- Actions ---
const togglingId = ref<string | null>(null);

async function handlePause(id: string) {
  togglingId.value = id;
  try {
    await trpc.recurring.pause.mutate({ id });
    await refetch();
  } catch {
    // Silently handle
  } finally {
    togglingId.value = null;
  }
}

async function handleResume(id: string) {
  togglingId.value = id;
  try {
    await trpc.recurring.resume.mutate({ id });
    await refetch();
  } catch {
    // Silently handle
  } finally {
    togglingId.value = null;
  }
}

// --- Delete state ---
const deletingId = ref<string | null>(null);
const deleteError = ref<string | null>(null);

async function handleDelete(id: string) {
  if (deletingId.value === id) {
    deleteError.value = null;

    try {
      await trpc.recurring.delete.mutate({ id });
      await refetch();
    } catch (err) {
      deleteError.value = err instanceof Error ? err.message : 'Failed to delete';
      return;
    }

    deletingId.value = null;
  } else {
    deletingId.value = id;
    deleteError.value = null;
  }
}

function cancelDelete() {
  deletingId.value = null;
  deleteError.value = null;
}

function formatDay(day: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const mod = day % 10;
  const suffix = mod >= 1 && mod <= 3 && (day < 11 || day > 13) ? suffixes[mod] : suffixes[0];
  return `${day}${suffix}`;
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Repeat :size="24" class="text-accent-gold" />
        <div>
          <h1 class="text-xl font-semibold text-text-primary">Recurring Transactions</h1>
          <p class="text-sm text-text-muted mt-0.5">
            {{ recurringList.length }} total &middot; {{ activeCount }} active
          </p>
        </div>
      </div>
      <button
        class="flex items-center gap-2 bg-accent-gold text-bg-primary font-semibold text-sm py-2 px-4 rounded-base hover:opacity-90 transition-opacity"
        @click="router.push('/recurring/create')"
      >
        <Plus :size="16" />
        New Recurring
      </button>
    </div>

    <!-- Loading state -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <div class="w-6 h-6 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-base px-4 py-3"
    >
      Failed to load recurring transactions.
    </div>

    <!-- Recurring list -->
    <div v-else class="bg-bg-surface border border-border-default rounded-base overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border-default">
            <th class="text-left text-xs font-medium text-text-muted px-5 py-3">
              Type
            </th>
            <th class="text-left text-xs font-medium text-text-muted px-5 py-3">
              Amount
            </th>
            <th class="text-left text-xs font-medium text-text-muted px-5 py-3">
              Category
            </th>
            <th class="text-left text-xs font-medium text-text-muted px-5 py-3">
              Day
            </th>
            <th class="text-left text-xs font-medium text-text-muted px-5 py-3">
              Status
            </th>
            <th class="text-left text-xs font-medium text-text-muted px-5 py-3">
              Note
            </th>
            <th class="text-right text-xs font-medium text-text-muted px-5 py-3">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in recurringList"
            :key="item.id"
            class="border-b border-border-default last:border-b-0 hover:bg-bg-card-hover transition-colors"
          >
            <td class="px-5 py-3">
              <span
                class="text-xs px-2 py-0.5 rounded-base font-mono"
                :class="
                  item.type === 'INCOME'
                    ? 'bg-accent-green/10 text-accent-green'
                    : 'bg-accent-red/10 text-accent-red'
                "
              >
                {{ item.type }}
              </span>
            </td>
            <td class="px-5 py-3 text-sm text-text-primary font-mono">
              {{ formatCurrency(item.amount, item.currency) }}
            </td>
            <td class="px-5 py-3 text-sm text-text-muted">
              {{ categoryMap.get(item.categoryId ?? '') ?? '--' }}
            </td>
            <td class="px-5 py-3 text-sm text-text-muted font-mono">
              {{ formatDay(item.dayOfMonth) }}
            </td>
            <td class="px-5 py-3">
              <span
                class="text-xs px-2 py-0.5 rounded-base"
                :class="
                  item.active
                    ? 'bg-accent-green/10 text-accent-green'
                    : 'bg-bg-card-hover text-text-muted'
                "
              >
                {{ item.active ? 'Active' : 'Paused' }}
              </span>
            </td>
            <td class="px-5 py-3 text-sm text-text-muted truncate max-w-[200px]">
              {{ item.note || '--' }}
            </td>
            <td class="px-5 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button
                  class="p-1 text-text-muted hover:text-accent-blue transition-colors"
                  title="Edit"
                  @click="router.push(`/recurring/${item.id}/edit`)"
                >
                  <Pencil :size="16" />
                </button>

                <button
                  v-if="item.active"
                  class="p-1 text-text-muted hover:text-accent-gold transition-colors"
                  title="Pause"
                  :disabled="togglingId === item.id"
                  @click="handlePause(item.id)"
                >
                  <Pause :size="16" />
                </button>
                <button
                  v-else
                  class="p-1 text-text-muted hover:text-accent-green transition-colors"
                  title="Resume"
                  :disabled="togglingId === item.id"
                  @click="handleResume(item.id)"
                >
                  <Play :size="16" />
                </button>

                <template v-if="deleteError && deletingId === item.id">
                  <span
                    class="text-xs text-accent-red truncate max-w-[120px]"
                    :title="deleteError"
                  >
                    Failed
                  </span>
                  <button
                    class="p-1 text-text-muted hover:text-text-primary transition-colors"
                    title="Dismiss"
                    @click="cancelDelete"
                  >
                    <X :size="14" />
                  </button>
                </template>
                <template v-else-if="deletingId === item.id">
                  <button
                    class="p-1 text-accent-red hover:text-accent-red/80 transition-colors"
                    title="Confirm delete"
                    @click="handleDelete(item.id)"
                  >
                    <Check :size="14" />
                  </button>
                  <button
                    class="p-1 text-text-muted hover:text-text-primary transition-colors"
                    title="Cancel"
                    @click="cancelDelete"
                  >
                    <X :size="14" />
                  </button>
                </template>
                <button
                  v-else
                  class="p-1 text-text-muted hover:text-accent-red transition-colors"
                  title="Delete"
                  @click="handleDelete(item.id)"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="recurringList.length === 0">
            <td
              colspan="7"
              class="px-5 py-8 text-center text-sm text-text-muted"
            >
              No recurring transactions yet. Click "New Recurring" to create one.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
