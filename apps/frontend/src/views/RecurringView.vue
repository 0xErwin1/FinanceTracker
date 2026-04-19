<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAccounts } from '@/composables/useAccounts';
import { useRecurring } from '@/composables/useRecurring';
import { useCategories } from '@/composables/useCategories';
import { trpc } from '@/api/trpc';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import type { CategoryDTO } from '@expenses/api';
import { Repeat, Plus, Pause, Play, Trash2, Pencil, Check, X } from 'lucide-vue-next';
import { formatCurrency } from '@/utils/format';
import { resolveLinkedAccountLabel } from './installments/installmentPlanForm';

const router = useRouter();
const { recurring, loading, error, refetch } = useRecurring();
const { categories: rawCategories } = useCategories();
const { accounts } = useAccounts();

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

const accountLabelByRecurringId = computed<Record<string, string>>(() => {
  return recurringList.value.reduce<Record<string, string>>((labels, item) => {
    labels[item.id] = resolveLinkedAccountLabel(item.accountId ?? null, accounts.value);
    return labels;
  }, {});
});

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
  <div class="space-y-4 lg:space-y-6">
    <!-- Header -->
    <ResponsivePageHeader
      title="Recurring Transactions"
      :subtitle="`${recurringList.length} total · ${activeCount} active`"
    >
      <template #actions>
        <button
          class="flex w-full items-center justify-center gap-2 rounded-base bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-primary transition-opacity hover:opacity-90 sm:w-auto"
          @click="router.push('/recurring/create')"
        >
          <Plus :size="16" />
          New Recurring
        </button>
      </template>
    </ResponsivePageHeader>

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
    <div v-else class="space-y-3">
      <div class="space-y-3 shell:hidden">
        <div
          v-for="item in recurringList"
          :key="`${item.id}-mobile`"
          class="rounded-base border border-border-default bg-bg-surface p-4"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="rounded-base px-2 py-0.5 font-mono text-xs"
                  :class="
                    item.type === 'INCOME'
                      ? 'bg-accent-green/10 text-accent-green'
                      : 'bg-accent-red/10 text-accent-red'
                  "
                >
                  {{ item.type }}
                </span>
                <span
                  class="rounded-base px-2 py-0.5 text-xs"
                  :class="
                    item.active
                      ? 'bg-accent-green/10 text-accent-green'
                      : 'bg-bg-card-hover text-text-muted'
                  "
                >
                  {{ item.active ? 'Active' : 'Paused' }}
                </span>
              </div>

              <p class="font-mono text-sm text-text-primary">
                {{ formatCurrency(item.amount, item.currency) }}
              </p>

              <p class="text-sm text-text-secondary">
                {{ categoryMap.get(item.categoryId ?? '') ?? '--' }} · {{ formatDay(item.dayOfMonth) }}
              </p>

              <p class="text-sm text-text-muted">
                {{ accountLabelByRecurringId[item.id] }}
              </p>

              <p class="text-sm text-text-muted">
                {{ item.note || '--' }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2 sm:justify-end">
              <button
                class="rounded-base border border-border-default px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-card"
                @click="router.push(`/recurring/${item.id}/edit`)"
              >
                Edit
              </button>

              <button
                v-if="item.active"
                class="rounded-base border border-border-default px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-card"
                :disabled="togglingId === item.id"
                @click="handlePause(item.id)"
              >
                Pause
              </button>
              <button
                v-else
                class="rounded-base border border-border-default px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-card"
                :disabled="togglingId === item.id"
                @click="handleResume(item.id)"
              >
                Resume
              </button>

              <button
                v-if="deletingId !== item.id"
                class="rounded-base border border-border-default px-3 py-2 text-xs text-accent-red transition-colors hover:bg-accent-red/10"
                @click="handleDelete(item.id)"
              >
                Delete
              </button>
            </div>

            <div v-if="deletingId === item.id" class="flex flex-col gap-2 border-t border-border-default/60 pt-3">
              <p v-if="deleteError" class="text-xs text-accent-red">{{ deleteError }}</p>
              <div class="flex gap-2">
                <button class="flex-1 rounded-base bg-accent-red px-3 py-2 text-xs font-medium text-bg-primary" @click="handleDelete(item.id)">
                  Confirm Delete
                </button>
                <button class="flex-1 rounded-base border border-border-default px-3 py-2 text-xs text-text-secondary" @click="cancelDelete">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="recurringList.length === 0"
          class="rounded-base border border-border-default bg-bg-surface px-5 py-8 text-center text-sm text-text-muted"
        >
          No recurring transactions yet. Click "New Recurring" to create one.
        </div>
      </div>

      <div class="app-safe-scroll-x hidden overflow-hidden rounded-base border border-border-default bg-bg-surface shell:block">
      <table class="w-full min-w-[820px]">
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
              Account
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
            <td class="px-5 py-3 text-sm text-text-muted">
              {{ accountLabelByRecurringId[item.id] }}
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
              colspan="8"
              class="px-5 py-8 text-center text-sm text-text-muted"
            >
              No recurring transactions yet. Click "New Recurring" to create one.
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  </div>
</template>
