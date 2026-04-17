<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Badge from '@/components/base/Badge.vue';
import { formatCurrency, formatDate } from '@/utils/format';
import { trpc } from '@/api/trpc';
import { Trash2, Pencil, Check, X } from 'lucide-vue-next';

export interface TransactionDisplay {
  id: string;
  date: string;
  categoryName: string;
  categoryIcon: string | null;
  note: string;
  amount: number;
  currency: string;
  type: string;
}

export interface DayGroup {
  date: string;
  displayDate: string;
  total: number;
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
    case 'INSTALLMENTS':
      return 'warning';
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
        class="flex items-center justify-between border-b border-border-default/50 bg-bg-card-hover px-4 py-2"
      >
        <span class="text-sm font-medium text-text-secondary">
          {{ group.displayDate }}
        </span>

        <span class="font-mono text-sm" :class="dailyTotalClass(group.total)">
          {{ formatCurrency(group.total) }}
        </span>
      </div>

      <!-- Transaction rows -->
      <table class="w-full text-sm">
        <tbody>
          <tr
            v-for="tx in group.transactions"
            :key="tx.id"
            class="cursor-pointer border-b border-border-default/30 last:border-b-0 transition-colors hover:bg-bg-card-hover"
          >
            <!-- Date -->
            <td class="w-24 px-4 py-2.5 text-xs text-text-muted">
              {{ formatDate(tx.date) }}
            </td>

            <!-- Category badge -->
            <td class="px-4 py-2.5">
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-bg-primary px-2 py-0.5 text-xs text-text-primary"
              >
                <span v-if="tx.categoryIcon">{{ tx.categoryIcon }}</span>

                {{ tx.categoryName }}
              </span>
            </td>

            <!-- Note -->
            <td class="px-4 py-2.5 text-text-secondary">
              {{ tx.note || '\u2014' }}
            </td>

            <!-- Amount -->
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

            <!-- Currency -->
            <td class="w-16 px-4 py-2.5 text-center text-xs text-text-muted">
              {{ tx.currency }}
            </td>

            <!-- Type badge -->
            <td class="w-28 px-4 py-2.5">
              <Badge
                :text="typeBadgeText(tx.type)"
                :variant="typeBadgeVariant(tx.type)"
              />
            </td>

            <!-- Actions -->
            <td class="w-24 px-4 py-2.5 text-right">
              <div v-if="deleteError && deletingId === tx.id" class="flex items-center justify-end gap-1">
                <span
                  class="text-xs text-accent-red truncate max-w-[100px]"
                  :title="deleteError"
                >
                  Failed
                </span>
                <button
                  class="p-1 text-text-muted hover:text-text-primary transition-colors"
                  title="Dismiss"
                  @click.stop="cancelDelete"
                >
                  <X :size="14" />
                </button>
              </div>
              <div v-else-if="deletingId === tx.id" class="flex items-center justify-end gap-1">
                <button
                  class="p-1 text-accent-red hover:text-accent-red/80 transition-colors"
                  title="Confirm delete"
                  @click.stop="handleDelete(tx.id)"
                >
                  <Check :size="14" />
                </button>
                <button
                  class="p-1 text-text-muted hover:text-text-primary transition-colors"
                  title="Cancel"
                  @click.stop="cancelDelete"
                >
                  <X :size="14" />
                </button>
              </div>
              <div v-else class="flex items-center justify-end gap-1">
                <button
                  class="p-1 text-text-muted hover:text-accent-gold transition-colors"
                  title="Edit transaction"
                  @click.stop="router.push(`/transactions/${tx.id}/edit`)"
                >
                  <Pencil :size="14" />
                </button>
                <button
                  class="p-1 text-text-muted hover:text-accent-red transition-colors"
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
