<script setup lang="ts">
import { Check, Pencil, Trash2, X } from 'lucide-vue-next';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { trpc } from '@/api/trpc';
import Badge from '@/components/base/Badge.vue';
import { formatCurrency, formatDate } from '@/utils/format';

export interface TransactionDisplay {
  id: string;
  date: string;
  categoryName: string;
  categoryIcon: string | null;
  note: string;
  amount: number;
  currency: string;
  type: string;
  accountName: string;
  counterpartyAccountName: string | null;
  transferGroupId: string | null;
  transferDirection: 'OUTGOING' | 'INCOMING' | null;
}

export interface DayGroup {
  date: string;
  displayDate: string;
  total: { amount: number; currency: string } | null;
  currencyTotals: Array<{ currency: string; amount: number }>;
  transactions: TransactionDisplay[];
}

interface Props {
  groups: DayGroup[];
  loading: boolean;
}

defineProps<Props>();
const emit = defineEmits<{ refresh: [] }>();

const router = useRouter();

// --- Delete state ---
const deletingId = ref<string | null>(null);
const deleteError = ref<string | null>(null);

async function handleDelete(id: string) {
  if (deletingId.value === id) {
    deleteError.value = null;

    try {
      await trpc.transaction.delete.mutate({ id });
      deletingId.value = null;
      emit('refresh');
    } catch (err) {
      deleteError.value = err instanceof Error ? err.message : 'Failed to delete transaction';
    }
  } else {
    deletingId.value = id;
    deleteError.value = null;
  }
}

function cancelDelete() {
  deletingId.value = null;
  deleteError.value = null;
}

function typeBadgeVariant(type: string): 'success' | 'danger' | 'info' | 'warning' | 'default' {
  switch (type) {
    case 'INCOME':
      return 'success';
    case 'EXPENSE':
      return 'danger';
    case 'SAVING':
      return 'info';
    default:
      return 'default';
  }
}

/** Format enum-style type to title case (EXPENSE → Expense). */
function typeBadgeText(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function dailyTotalClass(total: number): string {
  return total >= 0 ? 'text-accent-green' : 'text-accent-red';
}

function transferBadgeText(tx: TransactionDisplay): string | null {
  if (!tx.transferGroupId) {
    return null;
  }

  return tx.transferDirection === 'INCOMING' ? 'Transfer In' : 'Transfer Out';
}
</script>

<template>
  <!-- Loading skeleton -->
  <div v-if="loading" class="space-y-3">
    <div
      v-for="i in 3"
      :key="i"
      class="animate-pulse rounded-base border border-border-default bg-bg-card p-4"
    >
      <div class="mb-3 h-4 w-48 rounded bg-bg-primary" />

      <div v-for="j in 3" :key="j" class="mb-2 flex gap-4">
        <div class="h-4 w-20 rounded bg-bg-primary" />
        <div class="h-4 w-24 rounded bg-bg-primary" />
        <div class="h-4 w-32 rounded bg-bg-primary" />
        <div class="ml-auto h-4 w-20 rounded bg-bg-primary" />
      </div>
    </div>
  </div>

  <!-- Grouped ledger -->
  <div v-else class="space-y-2">
    <div
      v-for="group in groups"
      :key="group.date"
      class="overflow-hidden rounded-base border border-border-default bg-bg-card"
    >
      <!-- Group header: date + daily total -->
      <div
        class="flex flex-col gap-1 border-b border-border-default/50 bg-bg-card-hover px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <span class="text-sm font-medium text-text-secondary">
          {{ group.displayDate }}
        </span>

        <div v-if="group.total" class="text-right">
          <span class="font-mono text-sm" :class="dailyTotalClass(group.total.amount)">
            {{ formatCurrency(group.total.amount, group.total.currency) }}
          </span>
        </div>

        <div v-else class="text-right">
          <p class="text-xs text-text-muted">Native subtotals only</p>
          <p
            v-for="entry in group.currencyTotals"
            :key="`${group.date}-${entry.currency}`"
            class="font-mono text-xs"
            :class="dailyTotalClass(entry.amount)"
          >
            {{ entry.currency }} {{ formatCurrency(entry.amount, entry.currency) }}
          </p>
        </div>
      </div>

      <!-- Transaction rows -->
      <div class="space-y-3 p-3 shell:hidden">
        <div
          v-for="tx in group.transactions"
          :key="`${tx.id}-mobile`"
          class="rounded-base border border-border-default/60 bg-bg-primary/60 p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <Badge
                  :text="typeBadgeText(tx.type)"
                  :variant="typeBadgeVariant(tx.type)"
                />
                <span
                  class="inline-flex items-center gap-1.5 rounded-full bg-bg-card px-2 py-0.5 text-xs text-text-primary"
                >
                  {{ tx.categoryName }}
                </span>
              </div>

              <p class="text-sm font-medium text-text-primary">
                {{ tx.note || 'No note provided' }}
              </p>

              <p class="text-xs text-text-muted">
                {{ tx.accountName }}
                <span v-if="tx.counterpartyAccountName">→ {{ tx.counterpartyAccountName }}</span>
              </p>
            </div>

            <span
              class="shrink-0 text-right font-mono text-sm"
              :class="tx.type === 'INCOME' ? 'text-accent-green' : 'text-accent-red'"
            >
              {{ tx.type === 'INCOME' ? '+' : '-' }}
              {{ formatCurrency(tx.amount, tx.currency) }}
            </span>
          </div>

            <div class="mt-3 grid grid-cols-2 gap-3 text-xs text-text-secondary">
            <div>
              <p class="text-text-muted">Date</p>
              <p class="mt-1 text-text-primary">{{ formatDate(tx.date) }}</p>
            </div>

              <div>
                <p class="text-text-muted">Account</p>
                <p class="mt-1 text-text-primary">{{ tx.accountName }}</p>
              </div>
            </div>

          <div v-if="transferBadgeText(tx)" class="mt-3">
            <Badge :text="transferBadgeText(tx) ?? ''" variant="info" />
          </div>

          <div class="mt-3 border-t border-border-default/50 pt-3">
            <div v-if="deleteError && deletingId === tx.id" class="flex items-center justify-between gap-2">
              <span class="truncate text-xs text-accent-red" :title="deleteError">
                {{ deleteError }}
              </span>
              <button
                type="button"
                class="rounded-base px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary"
                @click.stop="cancelDelete"
              >
                Dismiss
              </button>
            </div>

            <div v-else-if="deletingId === tx.id" class="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                class="flex-1 rounded-base bg-accent-red px-3 py-2 text-xs font-medium text-bg-primary transition-colors hover:bg-accent-red/90"
                @click.stop="handleDelete(tx.id)"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                class="flex-1 rounded-base border border-border-default px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-card"
                @click.stop="cancelDelete"
              >
                Cancel
              </button>
            </div>

            <div v-else class="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                class="flex-1 rounded-base border border-border-default px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary"
                @click.stop="router.push(`/transactions/${tx.id}/edit`)"
              >
                Edit
              </button>
              <button
                type="button"
                class="flex-1 rounded-base border border-border-default px-3 py-2 text-xs text-accent-red transition-colors hover:bg-accent-red/10"
                @click.stop="handleDelete(tx.id)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="app-safe-scroll-x hidden shell:block">
        <table class="w-full min-w-[760px] text-sm">
          <tbody>
            <tr
              v-for="tx in group.transactions"
              :key="tx.id"
              class="cursor-pointer border-b border-border-default/30 last:border-b-0 transition-colors hover:bg-bg-card-hover"
            >
              <td class="w-24 px-4 py-2.5 text-xs text-text-muted">
                {{ formatDate(tx.date) }}
              </td>

              <td class="px-4 py-2.5">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full bg-bg-primary px-2 py-0.5 text-xs text-text-primary"
                >
                  {{ tx.categoryName }}
                </span>
              </td>

              <td class="px-4 py-2.5 text-text-secondary">
                {{ tx.note || '\u2014' }}
                <p class="mt-1 text-xs text-text-muted">
                  {{ tx.accountName }}
                  <span v-if="tx.counterpartyAccountName">→ {{ tx.counterpartyAccountName }}</span>
                </p>
              </td>

              <td class="px-4 py-2.5 text-right font-mono">
                <span
                  :class="
                    tx.type === 'INCOME' ? 'text-accent-green' : 'text-accent-red'
                  "
                >
                  {{ tx.type === 'INCOME' ? '+' : '-' }}
                  {{ formatCurrency(tx.amount, tx.currency) }}
                </span>
              </td>

              <td class="w-16 px-4 py-2.5 text-center text-xs text-text-muted">
                {{ tx.currency }}
              </td>

              <td class="w-28 px-4 py-2.5">
                <Badge
                  :text="transferBadgeText(tx) ?? typeBadgeText(tx.type)"
                  :variant="tx.transferGroupId ? 'info' : typeBadgeVariant(tx.type)"
                />
              </td>

              <td class="w-24 px-4 py-2.5 text-right">
                <div v-if="deleteError && deletingId === tx.id" class="flex items-center justify-end gap-1">
                  <span
                    class="max-w-[100px] truncate text-xs text-accent-red"
                    :title="deleteError"
                  >
                    Failed
                  </span>
                  <button
                    type="button"
                    class="p-1 text-text-muted transition-colors hover:text-text-primary"
                    title="Dismiss"
                    @click.stop="cancelDelete"
                  >
                    <X :size="14" />
                  </button>
                </div>
                <div v-else-if="deletingId === tx.id" class="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    class="p-1 text-accent-red transition-colors hover:text-accent-red/80"
                    title="Confirm delete"
                    @click.stop="handleDelete(tx.id)"
                  >
                    <Check :size="14" />
                  </button>
                  <button
                    type="button"
                    class="p-1 text-text-muted transition-colors hover:text-text-primary"
                    title="Cancel"
                    @click.stop="cancelDelete"
                  >
                    <X :size="14" />
                  </button>
                </div>
                <div v-else class="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    class="p-1 text-text-muted transition-colors hover:text-accent-gold"
                    title="Edit transaction"
                    @click.stop="router.push(`/transactions/${tx.id}/edit`)"
                  >
                    <Pencil :size="14" />
                  </button>
                  <button
                    type="button"
                    class="p-1 text-text-muted transition-colors hover:text-accent-red"
                    title="Delete transaction"
                    @click.stop="handleDelete(tx.id)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="groups.length === 0"
      class="rounded-base border border-border-default bg-bg-card px-4 py-12 text-center"
    >
      <p class="text-text-muted">No transactions match your filters.</p>

      <p class="mt-1 text-xs text-text-muted">
        Try adjusting the date range or operation type.
      </p>
    </div>
  </div>
</template>
