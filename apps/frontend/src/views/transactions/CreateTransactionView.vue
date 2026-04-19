<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-vue-next';
import { trpc } from '@/api/trpc';
import ResponsiveFormSection from '@/components/base/ResponsiveFormSection.vue';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import { useAccounts } from '@/composables/useAccounts';
import { useCategories } from '@/composables/useCategories';
import { TransactionType, CurrencyEnum } from '@expenses/api';
import { getTransferConstraintMessage, resolveTransferAccountOptions } from './transferForm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransactionFormRow {
  id: number;
  type: TransactionType;
  amount: string;
  currency: CurrencyEnum;
  accountId: string;
  categoryId: string;
  date: string;
  note: string;
}

interface TransferForm {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  currency: CurrencyEnum;
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
const { accounts, activeAccounts, postingAccountsForCurrency, defaultAccountIdForCurrency } = useAccounts();

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
  const currency = CurrencyEnum.USD;

  return {
    id: nextRowId++,
    type: TransactionType.EXPENSE,
    amount: '',
    currency,
    accountId: defaultAccountIdForCurrency(currency) ?? '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  };
}

const rows = ref<TransactionFormRow[]>([makeDefaultRow()]);
const entryMode = ref<'standard' | 'transfer'>('standard');
const transfer = ref<TransferForm>({
  sourceAccountId: defaultAccountIdForCurrency(CurrencyEnum.USD) ?? '',
  destinationAccountId: '',
  amount: '',
  currency: CurrencyEnum.USD,
  date: new Date().toISOString().split('T')[0],
  note: '',
});

const transferOptions = computed(() =>
  resolveTransferAccountOptions(
    accounts.value,
    transfer.value.currency,
    transfer.value.sourceAccountId || undefined,
  ),
);

const transferAccounts = computed(() => transferOptions.value.sourceAccounts);
const transferDestinationAccounts = computed(() => transferOptions.value.destinationAccounts);
const transferConstraintMessage = computed(() =>
  getTransferConstraintMessage(transferOptions.value, transfer.value.currency),
);

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

watch(
  () => rows.value.map((row) => row.currency),
  (currencies, previousCurrencies) => {
    currencies.forEach((currency, index) => {
      const previous = previousCurrencies?.[index];
      const row = rows.value[index];

      if (!row) {
        return;
      }

      const currencyAccounts = postingAccountsForCurrency(currency);
      const selectedAccountIsValid = currencyAccounts.some((account) => account.id === row.accountId);

      if (currency !== previous || !selectedAccountIsValid) {
        row.accountId = currencyAccounts[0]?.id ?? '';
      }
    });
  },
  { immediate: true },
);

watch(
  () => transfer.value.currency,
  () => {
    if (transfer.value.sourceAccountId !== transferOptions.value.selectedSourceAccountId) {
      transfer.value.sourceAccountId = transferOptions.value.selectedSourceAccountId;
    }

    if (
      !transferDestinationAccounts.value.some((account) => account.id === transfer.value.destinationAccountId)
    ) {
      transfer.value.destinationAccountId = transferDestinationAccounts.value[0]?.id ?? '';
    }
  },
  { immediate: true },
);

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

const submitting = ref(false);
const errorMsg = ref('');

const fieldClass =
  'w-full rounded-base border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent-gold';

const dateFieldClass = `${fieldClass} [color-scheme:dark]`;

function buildPayload() {
  return rows.value.map((r) => ({
    type: r.type,
    amount: Number(r.amount),
    currency: r.currency,
    accountId: r.accountId,
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
    if (!t.accountId) {
      return `Row ${i + 1}: Account is required.`;
    }
  }
  return null;
}

function validateTransferForm(): string | null {
  if (!transfer.value.sourceAccountId || !transfer.value.destinationAccountId) {
    return 'Transfer requires both source and destination accounts.';
  }

  if (transfer.value.sourceAccountId === transfer.value.destinationAccountId) {
    return 'Transfer accounts must be different.';
  }

  if (!transfer.value.amount || Number(transfer.value.amount) <= 0) {
    return 'Transfer amount must be greater than 0.';
  }

  if (!transfer.value.date) {
    return 'Transfer date is required.';
  }

  return null;
}

async function submitAll() {
  errorMsg.value = '';

  if (entryMode.value === 'transfer') {
    const validationError = validateTransferForm();
    if (validationError) {
      errorMsg.value = validationError;
      return;
    }

    submitting.value = true;

    try {
      await trpc.transaction.createTransfer.mutate({
        sourceAccountId: transfer.value.sourceAccountId,
        destinationAccountId: transfer.value.destinationAccountId,
        amount: Number(transfer.value.amount),
        currency: transfer.value.currency,
        date: transfer.value.date,
        note: transfer.value.note || undefined,
      });

      transfer.value = {
        sourceAccountId: defaultAccountIdForCurrency(transfer.value.currency) ?? '',
        destinationAccountId: '',
        amount: '',
        currency: transfer.value.currency,
        date: new Date().toISOString().split('T')[0],
        note: '',
      };

      await router.push('/transactions');
    } catch (err) {
      errorMsg.value = err instanceof Error ? err.message : 'Failed to create transfer.';
    } finally {
      submitting.value = false;
    }

    return;
  }

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

  if (entryMode.value === 'transfer') {
    const validationError = validateTransferForm();
    if (validationError) {
      errorMsg.value = validationError;
      return;
    }

    submitting.value = true;

    try {
      await trpc.transaction.createTransfer.mutate({
        sourceAccountId: transfer.value.sourceAccountId,
        destinationAccountId: transfer.value.destinationAccountId,
        amount: Number(transfer.value.amount),
        currency: transfer.value.currency,
        date: transfer.value.date,
        note: transfer.value.note || undefined,
      });

      transfer.value = {
        sourceAccountId: defaultAccountIdForCurrency(transfer.value.currency) ?? '',
        destinationAccountId: '',
        amount: '',
        currency: transfer.value.currency,
        date: new Date().toISOString().split('T')[0],
        note: '',
      };
    } catch (err) {
      errorMsg.value = err instanceof Error ? err.message : 'Failed to create transfer.';
    } finally {
      submitting.value = false;
    }

    return;
  }

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
  <div class="flex flex-col gap-4 lg:gap-6">
    <ResponsivePageHeader
      title="New Transactions"
      subtitle="Create one or more transactions without losing access to required fields or actions on smaller screens."
    >
      <template #actions>
        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-base border border-border-default px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary sm:w-auto"
          title="Back to Transactions"
          @click="router.push('/transactions')"
        >
          <ArrowLeft :size="16" />
          Back to Transactions
        </button>
      </template>
    </ResponsivePageHeader>

    <ResponsiveFormSection
      title="Transaction entries"
      description="Rows stack on mobile and expand into denser grids on larger screens."
    >
      <div class="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-base px-3 py-1.5 text-sm transition-colors"
          :class="entryMode === 'standard' ? 'bg-accent-gold text-bg-primary' : 'border border-border-default text-text-secondary hover:bg-bg-card'"
          @click="entryMode = 'standard'"
        >
          Standard entries
        </button>
        <button
          type="button"
          class="rounded-base px-3 py-1.5 text-sm transition-colors"
          :class="entryMode === 'transfer' ? 'bg-accent-gold text-bg-primary' : 'border border-border-default text-text-secondary hover:bg-bg-card'"
          @click="entryMode = 'transfer'"
        >
          Transfer between accounts
        </button>
      </div>

      <div v-if="activeAccounts.length === 0" class="mb-4 rounded-base border border-dashed border-border-default px-4 py-3 text-sm text-text-muted">
        Create an account first in <button type="button" class="text-accent-gold underline" @click="router.push('/accounts')">Accounts</button> before saving new transactions.
      </div>

      <div class="space-y-4">
        <div
          v-if="entryMode === 'transfer'"
          class="rounded-base border border-border-default bg-bg-primary/50 p-4"
        >
          <div v-if="transferConstraintMessage" class="rounded-base border border-dashed border-border-default px-4 py-3 text-sm text-text-muted">
            {{ transferConstraintMessage }}
          </div>

          <div v-else class="grid grid-cols-1 gap-4 shell:grid-cols-2 xl:grid-cols-5">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-medium uppercase tracking-wide text-text-muted">Source account</label>
              <select v-model="transfer.sourceAccountId" :class="fieldClass">
                <option value="">Select account</option>
                <option v-for="account in transferAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-medium uppercase tracking-wide text-text-muted">Destination account</label>
              <select v-model="transfer.destinationAccountId" :class="fieldClass">
                <option value="">Select account</option>
                <option
                  v-for="account in transferDestinationAccounts"
                  :key="`${account.id}-destination`"
                  :value="account.id"
                >
                  {{ account.name }}
                </option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-medium uppercase tracking-wide text-text-muted">Amount</label>
              <input v-model="transfer.amount" type="number" min="0" step="0.01" placeholder="0.00" :class="dateFieldClass" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-medium uppercase tracking-wide text-text-muted">Currency</label>
              <select v-model="transfer.currency" :class="fieldClass">
                <option :value="CurrencyEnum.USD">USD</option>
                <option :value="CurrencyEnum.UYU">UYU</option>
                <option :value="CurrencyEnum.EUR">EUR</option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-medium uppercase tracking-wide text-text-muted">Date</label>
              <input v-model="transfer.date" type="date" :class="dateFieldClass" />
            </div>

            <div class="flex flex-col gap-1.5 shell:col-span-2 xl:col-span-5">
              <label class="text-[10px] font-medium uppercase tracking-wide text-text-muted">Note</label>
              <input v-model="transfer.note" type="text" placeholder="Optional transfer note..." :class="fieldClass" />
            </div>
          </div>
        </div>

        <div
          v-else
          v-for="(row, index) in rows"
          :key="row.id"
          class="rounded-base border border-border-default bg-bg-primary/50 p-4"
        >
          <div class="mb-4 flex flex-col gap-3 border-b border-border-default/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-sm font-medium text-text-primary">
                Transaction {{ index + 1 }}
              </p>
              <p class="mt-1 text-xs text-text-muted">
                All fields remain reachable on narrow viewports.
              </p>
            </div>

            <button
              type="button"
              :disabled="rows.length <= 1"
              class="inline-flex w-full items-center justify-center gap-2 rounded-base border border-border-default px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-accent-red disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
              title="Remove row"
              @click="removeRow(row.id)"
            >
              <Trash2 :size="16" />
              Remove row
            </button>
          </div>

          <div class="grid grid-cols-1 gap-4 shell:grid-cols-2 xl:grid-cols-7">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-medium uppercase tracking-wide text-text-muted">
                Type
              </label>
              <select v-model="row.type" :class="fieldClass">
                <option :value="TransactionType.EXPENSE">Expense</option>
                <option :value="TransactionType.INCOME">Income</option>
                <option :value="TransactionType.SAVING">Saving</option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-medium uppercase tracking-wide text-text-muted">
                Amount
              </label>
              <input
                v-model="row.amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                :class="dateFieldClass"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-medium uppercase tracking-wide text-text-muted">
                Currency
              </label>
              <select v-model="row.currency" :class="fieldClass">
                <option :value="CurrencyEnum.USD">USD</option>
                <option :value="CurrencyEnum.UYU">UYU</option>
                <option :value="CurrencyEnum.EUR">EUR</option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-medium uppercase tracking-wide text-text-muted">
                Account
              </label>
              <select v-model="row.accountId" :class="fieldClass">
                <option value="">Select account</option>
                <option v-for="account in postingAccountsForCurrency(row.currency)" :key="account.id" :value="account.id">
                  {{ account.name }}
                </option>
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-medium uppercase tracking-wide text-text-muted">
                Category
              </label>
              <select v-model="row.categoryId" :class="fieldClass">
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

            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-medium uppercase tracking-wide text-text-muted">
                Date
              </label>
              <input v-model="row.date" type="date" :class="dateFieldClass" />
            </div>

            <div class="flex flex-col gap-1.5 xl:col-span-2">
              <label class="text-[10px] font-medium uppercase tracking-wide text-text-muted">
                Note
              </label>
              <input
                v-model="row.note"
                type="text"
                placeholder="Optional note..."
                :class="fieldClass"
              />
            </div>
          </div>
        </div>

        <div v-if="errorMsg" class="rounded-base border border-accent-red/30 bg-accent-red/10 px-4 py-3">
          <p class="text-sm text-accent-red">{{ errorMsg }}</p>
        </div>
      </div>

      <template #actions>
        <button
          v-if="entryMode === 'standard'"
          type="button"
          class="flex w-full items-center justify-center gap-1.5 rounded-base border border-border-default px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card-hover sm:w-auto sm:mr-auto"
          @click="addRow"
        >
          <Plus :size="14" />
          Add Row
        </button>

        <button
          type="button"
          :disabled="submitting"
          class="flex w-full items-center justify-center gap-1.5 rounded-base border border-border-default px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          @click="createAndAddAnother"
        >
          Create & Add Another
        </button>

        <button
          type="button"
          :disabled="submitting"
          class="flex w-full items-center justify-center gap-1.5 rounded-base bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-gold/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          @click="submitAll"
        >
          <Loader2 v-if="submitting" :size="14" class="animate-spin" />
          {{ submitting ? 'Creating...' : 'Create & Go Back' }}
        </button>
      </template>
    </ResponsiveFormSection>
  </div>
</template>
