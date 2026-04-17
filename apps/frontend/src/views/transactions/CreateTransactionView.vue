<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-vue-next';
import { trpc } from '@/api/trpc';
import { useCategories } from '@/composables/useCategories';
import { TransactionType, CurrencyEnum } from '@expenses/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransactionFormRow {
  id: number;
  type: TransactionType;
  amount: string;
  currency: CurrencyEnum;
  categoryId: string;
  date: string;
  note: string;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

const router = useRouter();

// ---------------------------------------------------------------------------
// Category data
// ---------------------------------------------------------------------------

const { categories } = useCategories();

function filteredCategories(type: TransactionType) {
  const items = categories.value;
  if (!Array.isArray(items)) return [];
  const all = items as Array<{ id: string; name: string; type?: string }>;

  if (type === TransactionType.EXPENSE) return all.filter((c) => c.type === 'EXPENSE');
  if (type === TransactionType.INCOME) return all.filter((c) => c.type === 'INCOME');
  return all;
}

// ---------------------------------------------------------------------------
// Form rows
// ---------------------------------------------------------------------------

let nextRowId = 1;

function makeDefaultRow(): TransactionFormRow {
  return {
    id: nextRowId++,
    type: TransactionType.EXPENSE,
    amount: '',
    currency: CurrencyEnum.USD,
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  };
}

const rows = ref<TransactionFormRow[]>([makeDefaultRow()]);

function addRow() {
  rows.value.push(makeDefaultRow());
}

function removeRow(id: number) {
  if (rows.value.length <= 1) return;
  rows.value = rows.value.filter((r) => r.id !== id);
}

// ---------------------------------------------------------------------------
// Reactive: clear category when transaction type changes
// ---------------------------------------------------------------------------

watch(
  () => rows.value.map((r) => r.type),
  (newTypes, oldTypes) => {
    if (!oldTypes) return;

    for (let i = 0; i < newTypes.length; i++) {
      if (newTypes[i] !== oldTypes[i]) {
        const row = rows.value[i];
        if (row.categoryId) {
          const valid = filteredCategories(row.type).some((c) => c.id === row.categoryId);
          if (!valid) {
            row.categoryId = '';
          }
        }
      }
    }
  },
);

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

const submitting = ref(false);
const errorMsg = ref('');

function buildPayload() {
  return rows.value.map((r) => ({
    type: r.type,
    amount: Number(r.amount),
    currency: r.currency,
    date: r.date,
    note: r.note || undefined,
    categoryId: r.categoryId || undefined,
  }));
}

function validate(transactions: ReturnType<typeof buildPayload>): string | null {
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    if (!t.amount || t.amount <= 0) {
      return `Row ${i + 1}: Amount must be greater than 0.`;
    }
    if (!t.date) {
      return `Row ${i + 1}: Date is required.`;
    }
  }
  return null;
}

async function submitAll() {
  errorMsg.value = '';

  const transactions = buildPayload();
  const validationError = validate(transactions);
  if (validationError) {
    errorMsg.value = validationError;
    return;
  }

  submitting.value = true;

  try {
    if (transactions.length === 1) {
      await trpc.transaction.create.mutate({
        mode: 'single' as const,
        transaction: transactions[0],
      });
    } else {
      await trpc.transaction.create.mutate({
        mode: 'batch' as const,
        transactions,
      });
    }

    rows.value = [makeDefaultRow()];
    await router.push('/transactions');
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Failed to create transactions.';
  } finally {
    submitting.value = false;
  }
}

async function createAndAddAnother() {
  errorMsg.value = '';

  const transactions = buildPayload();
  const validationError = validate(transactions);
  if (validationError) {
    errorMsg.value = validationError;
    return;
  }

  submitting.value = true;

  try {
    if (transactions.length === 1) {
      await trpc.transaction.create.mutate({
        mode: 'single' as const,
        transaction: transactions[0],
      });
    } else {
      await trpc.transaction.create.mutate({
        mode: 'batch' as const,
        transactions,
      });
    }

    rows.value = [makeDefaultRow()];
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Failed to create transactions.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          class="p-1.5 rounded-base text-text-muted hover:text-text-primary transition-colors"
          title="Back to Transactions"
          @click="router.push('/transactions')"
        >
          <ArrowLeft :size="20" />
        </button>
        <h1 class="text-xl font-semibold text-text-primary">
          New Transactions
        </h1>
      </div>
    </div>

    <!-- Form card -->
    <div class="rounded-base border border-border-default bg-bg-card overflow-hidden">
      <!-- Rows -->
      <div class="p-5 space-y-3">
        <div
          v-for="(row, index) in rows"
          :key="row.id"
          class="flex items-end gap-3"
        >
          <!-- Type -->
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-medium text-text-muted uppercase tracking-wide">
              Type
            </label>
            <select
              v-model="row.type"
              class="rounded-base border border-border-default bg-bg-primary px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent-gold transition-colors"
            >
              <option :value="TransactionType.EXPENSE">Expense</option>
              <option :value="TransactionType.INCOME">Income</option>
              <option :value="TransactionType.SAVING">Saving</option>
            </select>
          </div>

          <!-- Amount -->
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-medium text-text-muted uppercase tracking-wide">
              Amount
            </label>
            <input
              v-model="row.amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              class="w-28 rounded-base border border-border-default bg-bg-primary px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent-gold transition-colors [color-scheme:dark]"
            />
          </div>

          <!-- Currency -->
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-medium text-text-muted uppercase tracking-wide">
              Currency
            </label>
            <select
              v-model="row.currency"
              class="rounded-base border border-border-default bg-bg-primary px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent-gold transition-colors"
            >
              <option :value="CurrencyEnum.USD">USD</option>
              <option :value="CurrencyEnum.UYU">UYU</option>
              <option :value="CurrencyEnum.EUR">EUR</option>
            </select>
          </div>

          <!-- Category -->
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-medium text-text-muted uppercase tracking-wide">
              Category
            </label>
            <select
              v-model="row.categoryId"
              class="rounded-base border border-border-default bg-bg-primary px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent-gold transition-colors"
            >
              <option value="">None</option>
              <option
                v-for="cat in filteredCategories(row.type)"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Date -->
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-medium text-text-muted uppercase tracking-wide">
              Date
            </label>
            <input
              v-model="row.date"
              type="date"
              class="rounded-base border border-border-default bg-bg-primary px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent-gold transition-colors [color-scheme:dark]"
            />
          </div>

          <!-- Note -->
          <div class="flex flex-col gap-1 flex-1 min-w-[120px]">
            <label class="text-[10px] font-medium text-text-muted uppercase tracking-wide">
              Note
            </label>
            <input
              v-model="row.note"
              type="text"
              placeholder="Optional note..."
              class="rounded-base border border-border-default bg-bg-primary px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent-gold transition-colors"
            />
          </div>

          <!-- Remove row -->
          <button
            :disabled="rows.length <= 1"
            class="p-1.5 rounded-base text-text-muted transition-colors hover:text-accent-red disabled:opacity-30 disabled:cursor-not-allowed"
            title="Remove row"
            @click="removeRow(row.id)"
          >
            <Trash2 :size="16" />
          </button>
        </div>
      </div>

      <!-- Error message -->
      <div v-if="errorMsg" class="px-5 pb-3">
        <p class="text-xs text-accent-red">{{ errorMsg }}</p>
      </div>

      <!-- Footer actions -->
      <div class="flex items-center justify-between px-5 py-3 border-t border-border-default">
        <button
          class="flex items-center gap-1.5 rounded-base border border-border-default px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-card-hover"
          @click="addRow"
        >
          <Plus :size="14" />
          Add Row
        </button>

        <div class="flex items-center gap-2">
          <button
            :disabled="submitting"
            class="flex items-center gap-1.5 rounded-base border border-border-default px-4 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-card-hover disabled:opacity-50 disabled:cursor-not-allowed"
            @click="createAndAddAnother"
          >
            Create & Add Another
          </button>

          <button
            :disabled="submitting"
            class="flex items-center gap-1.5 rounded-base bg-accent-gold px-4 py-1.5 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-gold/90 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="submitAll"
          >
            <Loader2 v-if="submitting" :size="14" class="animate-spin" />
            {{ submitting ? 'Creating...' : 'Create & Go Back' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
