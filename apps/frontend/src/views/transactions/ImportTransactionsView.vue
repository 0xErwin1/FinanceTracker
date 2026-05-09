<script setup lang="ts">
import {
  CurrencyEnum,
  type TransactionImportMappingDTO,
  type TransactionImportSourceFormat,
  type TransactionImportTypeStrategy,
  TransactionType,
} from '@expenses/api';
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import ResponsiveFormSection from '@/components/base/ResponsiveFormSection.vue';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import { useAccounts } from '@/composables/useAccounts';
import { useCategories } from '@/composables/useCategories';
import { useTransactionImport } from '@/composables/useTransactionImport';
import {
  applyImportedSourceFileError,
  applyImportedSourceFileSelection,
  buildImportPreviewRequest,
  getCommitDisabledReason,
  getImportPreviewErrorMessage,
  getImportSourceGuidance,
  getImportStatusPresentation,
  readImportSourceFile,
  validateImportDraft,
} from './importTransactionsPresentation';

const router = useRouter();

const { postingAccountsForCurrency } = useAccounts();
const { categories } = useCategories();
const transactionImport = useTransactionImport();

const fieldClass =
  'w-full rounded-base border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent-gold';
const dateFieldClass = `${fieldClass} [color-scheme:dark]`;
const statusToneClass: Record<'success' | 'danger' | 'muted' | 'warning', string> = {
  success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  danger: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
  muted: 'border-border-default bg-bg-card text-text-secondary',
  warning: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
};

const currencyOptions = Object.values(CurrencyEnum);

interface ImportFormState {
  source: string;
  sourceFilename?: string;
  sourceFormat: TransactionImportSourceFormat;
  defaults: {
    accountId: string;
    categoryId: string;
    currency: CurrencyEnum;
    fixedType: TransactionType;
    typeStrategy: TransactionImportTypeStrategy;
  };
  mapping: Record<keyof TransactionImportMappingDTO, string>;
}

const form = reactive<ImportFormState>({
  source: '',
  sourceFilename: undefined,
  sourceFormat: 'csv',
  defaults: {
    accountId: '',
    categoryId: '',
    currency: CurrencyEnum.USD,
    fixedType: TransactionType.EXPENSE,
    typeStrategy: 'signed_amount',
  },
  mapping: {
    amount: '',
    credit: '',
    date: '',
    debit: '',
    description: '',
    externalReference: '',
  } satisfies Record<keyof TransactionImportMappingDTO, string>,
});

const formIssues = ref<string[]>([]);
const selectedFileName = ref<string | null>(null);
const sourceFileError = ref<string | null>(null);

const accountOptions = computed(() => postingAccountsForCurrency(form.defaults.currency));
const categoryOptions = computed(() => {
  const items = Array.isArray(categories.value) ? categories.value : [];

  if (form.defaults.typeStrategy !== 'fixed_type') {
    return items;
  }

  return items.filter((category) => category.type === form.defaults.fixedType);
});

const availableHeaders = computed(() => transactionImport.preview.value?.headers ?? []);
const previewRows = computed(() => transactionImport.preview.value?.rows ?? []);
const parserIssues = computed(() => transactionImport.preview.value?.parserIssues ?? []);
const previewErrorMessage = computed(() =>
  getImportPreviewErrorMessage(transactionImport.previewError.value, form.sourceFormat),
);
const sourceGuidance = computed(() => getImportSourceGuidance(form.sourceFormat));
const approvedRowCount = computed(() => transactionImport.approvedPreviewRows.value.length);
const commitDisabledReason = computed(() =>
  getCommitDisabledReason({
    approvedRowCount: approvedRowCount.value,
    commitLoading: transactionImport.commitLoading.value,
    preview: transactionImport.preview.value,
    previewLoading: transactionImport.previewLoading.value,
  }),
);

watch(
  () => form.defaults.currency,
  (currency) => {
    const nextAccountId = postingAccountsForCurrency(currency)[0]?.id ?? '';
    const hasSelectedAccount = postingAccountsForCurrency(currency).some(
      (account) => account.id === form.defaults.accountId,
    );

    if (!hasSelectedAccount) {
      form.defaults.accountId = nextAccountId;
    }
  },
  { immediate: true },
);

watch(
  () => form.defaults.typeStrategy,
  (typeStrategy) => {
    if (typeStrategy === 'signed_amount') {
      form.defaults.fixedType = TransactionType.EXPENSE;
    }
  },
);

async function handleSourceFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0] ?? null;

  selectedFileName.value = file?.name ?? null;
  sourceFileError.value = null;

  if (file === null) {
    return;
  }

  try {
    const result = await readImportSourceFile(file);
    const nextState = applyImportedSourceFileSelection(result);

    form.source = nextState.formSource;
    form.sourceFilename = nextState.sourceFilename;
    form.sourceFormat = nextState.sourceFormat;
    formIssues.value = nextState.formIssues;
    sourceFileError.value = nextState.sourceFileError;
  } catch (error) {
    const nextState = applyImportedSourceFileError(error instanceof Error ? error.message : String(error));

    form.source = nextState.formSource;
    form.sourceFilename = nextState.sourceFilename;
    form.sourceFormat = nextState.sourceFormat;
    sourceFileError.value = nextState.sourceFileError;
  }
}

function handleSourceInput(): void {
  form.sourceFormat = 'csv';
  form.sourceFilename = undefined;
  selectedFileName.value = null;
}

async function handlePreview(): Promise<void> {
  const issues = validateImportDraft({
    defaults: form.defaults,
    mapping: form.mapping,
    source: form.source,
    sourceFilename: form.sourceFilename,
    sourceFormat: form.sourceFormat,
  });

  formIssues.value = issues;

  if (issues.length > 0) {
    return;
  }

  const result = await transactionImport.requestPreview(
    buildImportPreviewRequest({
      defaults: {
        accountId: form.defaults.accountId,
        categoryId: form.defaults.categoryId,
        currency: form.defaults.currency,
        fixedType: form.defaults.fixedType,
        typeStrategy: form.defaults.typeStrategy,
      },
      mapping: form.mapping,
      source: form.source,
      sourceFilename: form.sourceFilename,
      sourceFormat: form.sourceFormat,
    }),
  );

  form.mapping.amount = result.mapping.amount ?? '';
  form.mapping.credit = result.mapping.credit ?? '';
  form.mapping.date = result.mapping.date ?? '';
  form.mapping.debit = result.mapping.debit ?? '';
  form.mapping.description = result.mapping.description ?? '';
  form.mapping.externalReference = result.mapping.externalReference ?? '';
}

async function handleCommit(): Promise<void> {
  if (commitDisabledReason.value !== null) {
    return;
  }

  await transactionImport.commitApprovedRows({
    accountId: form.defaults.accountId,
    categoryId: form.defaults.categoryId.trim().length > 0 ? form.defaults.categoryId : null,
  });
}
</script>

<template>
  <div class="space-y-4 lg:space-y-5">
    <ResponsivePageHeader
      title="Import transactions"
      subtitle="Upload bank CSV data or a text-based PDF statement, confirm the inferred mapping when needed, and commit only the rows that survive preview validation."
    >
      <template #actions>
        <button
          type="button"
          class="inline-flex w-full items-center justify-center rounded-base border border-border-default px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary sm:w-auto"
          @click="router.push('/transactions')"
        >
          Back to transactions
        </button>
      </template>
    </ResponsivePageHeader>

    <ResponsiveFormSection
      title="Source and defaults"
      description="Upload a CSV file or a text-based PDF statement, pick the destination account, and confirm the columns the backend should interpret when the source is CSV."
      :columns="2"
    >
      <div class="space-y-1.5 shell:col-span-2">
        <label for="import-source-file" class="text-xs font-medium text-text-muted">CSV or PDF file</label>
        <input
          id="import-source-file"
          type="file"
          accept=".csv,text/csv,.pdf,application/pdf"
          :class="fieldClass"
          @change="handleSourceFileChange"
        />
        <p class="text-xs text-text-muted">
          {{ sourceGuidance }}
        </p>
        <p v-if="selectedFileName" class="text-xs text-text-secondary">Loaded file: {{ selectedFileName }}</p>
        <p v-if="sourceFileError" class="text-xs text-rose-100">{{ sourceFileError }}</p>
      </div>

      <div v-if="form.sourceFormat === 'csv'" class="space-y-1.5 shell:col-span-2">
        <label for="import-source" class="text-xs font-medium text-text-muted">CSV source</label>
        <textarea
          id="import-source"
          v-model="form.source"
          rows="10"
          :class="fieldClass"
          placeholder="Date,Description,Amount&#10;2026-05-08,Coffee,-12.50"
          @input="handleSourceInput"
        />
      </div>

      <div v-else class="space-y-2 shell:col-span-2 rounded-base border border-border-default bg-bg-card px-3 py-2 text-sm text-text-secondary">
        <p>PDF source loaded: {{ form.sourceFilename ?? selectedFileName ?? 'statement.pdf' }}</p>
        <p class="text-xs text-text-muted">
          The backend will extract selectable text, normalize supported statement rows, and reject scanned PDFs or unsupported layouts before any preview rows are created.
        </p>
      </div>

      <div class="space-y-1.5">
        <label for="import-account" class="text-xs font-medium text-text-muted">Destination account</label>
        <select id="import-account" v-model="form.defaults.accountId" :class="fieldClass">
          <option value="">Select an account</option>
          <option v-for="account in accountOptions" :key="account.id" :value="account.id">
            {{ account.name }} · {{ account.currency }}
          </option>
        </select>
      </div>

      <div class="space-y-1.5">
        <label for="import-currency" class="text-xs font-medium text-text-muted">Currency</label>
        <select id="import-currency" v-model="form.defaults.currency" :class="fieldClass">
          <option v-for="currency in currencyOptions" :key="currency" :value="currency">
            {{ currency }}
          </option>
        </select>
      </div>

      <div class="space-y-1.5">
        <label for="import-type-strategy" class="text-xs font-medium text-text-muted">Type strategy</label>
        <select id="import-type-strategy" v-model="form.defaults.typeStrategy" :class="fieldClass">
          <option value="signed_amount">Signed amount</option>
          <option value="fixed_type">Fixed transaction type</option>
        </select>
      </div>

      <div v-if="form.defaults.typeStrategy === 'fixed_type'" class="space-y-1.5">
        <label for="import-fixed-type" class="text-xs font-medium text-text-muted">Fixed type</label>
        <select id="import-fixed-type" v-model="form.defaults.fixedType" :class="fieldClass">
          <option :value="TransactionType.EXPENSE">Expense</option>
          <option :value="TransactionType.INCOME">Income</option>
          <option :value="TransactionType.SAVING">Saving</option>
        </select>
      </div>

      <div class="space-y-1.5">
        <label for="import-category" class="text-xs font-medium text-text-muted">Default category</label>
        <select id="import-category" v-model="form.defaults.categoryId" :class="fieldClass">
          <option value="">No default category</option>
          <option v-for="category in categoryOptions" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </div>

      <div class="space-y-1.5">
        <label for="mapping-date" class="text-xs font-medium text-text-muted">Date column</label>
        <input id="mapping-date" v-model="form.mapping.date" list="import-headers" :class="fieldClass" />
      </div>

      <div class="space-y-1.5">
        <label for="mapping-description" class="text-xs font-medium text-text-muted">Description column</label>
        <input
          id="mapping-description"
          v-model="form.mapping.description"
          list="import-headers"
          :class="fieldClass"
        />
      </div>

      <div class="space-y-1.5">
        <label for="mapping-amount" class="text-xs font-medium text-text-muted">Signed amount column</label>
        <input id="mapping-amount" v-model="form.mapping.amount" list="import-headers" :class="fieldClass" />
      </div>

      <div class="space-y-1.5">
        <label for="mapping-debit" class="text-xs font-medium text-text-muted">Debit column</label>
        <input id="mapping-debit" v-model="form.mapping.debit" list="import-headers" :class="fieldClass" />
      </div>

      <div class="space-y-1.5">
        <label for="mapping-credit" class="text-xs font-medium text-text-muted">Credit column</label>
        <input id="mapping-credit" v-model="form.mapping.credit" list="import-headers" :class="fieldClass" />
      </div>

      <div class="space-y-1.5">
        <label for="mapping-reference" class="text-xs font-medium text-text-muted">Reference column</label>
        <input
          id="mapping-reference"
          v-model="form.mapping.externalReference"
          list="import-headers"
          :class="fieldClass"
        />
      </div>

      <template #actions>
        <div class="flex-1 text-xs text-text-muted sm:max-w-xl">
          Use exact header names. You can leave optional fields blank and the backend will keep the preview authoritative.
        </div>

        <button
          type="button"
          class="inline-flex items-center justify-center rounded-base bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="transactionImport.previewLoading.value"
          @click="handlePreview"
        >
          {{ transactionImport.previewLoading.value ? 'Generating preview…' : 'Generate preview' }}
        </button>
      </template>
    </ResponsiveFormSection>

    <datalist id="import-headers">
      <option v-for="header in availableHeaders" :key="header" :value="header" />
    </datalist>

    <div v-if="formIssues.length > 0" class="rounded-base border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
      <p class="font-medium">Preview is blocked until the required inputs are complete.</p>
      <ul class="mt-2 list-disc space-y-1 pl-5">
        <li v-for="issue in formIssues" :key="issue">{{ issue }}</li>
      </ul>
    </div>

      <div v-if="previewErrorMessage" class="rounded-base border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
        {{ previewErrorMessage }}
      </div>

    <ResponsiveFormSection
      title="Preview"
      description="Only ready or review-required rows can stay approved. Invalid rows must be resolved before the final commit is enabled."
    >
      <div class="grid gap-3 md:grid-cols-5">
        <article class="rounded-base border border-border-default bg-bg-primary p-4">
          <p class="text-xs uppercase tracking-wide text-text-muted">Total rows</p>
          <p class="mt-2 text-2xl font-semibold text-text-primary">{{ transactionImport.preview.value?.summary.total ?? 0 }}</p>
        </article>
        <article class="rounded-base border border-emerald-400/30 bg-emerald-500/10 p-4">
          <p class="text-xs uppercase tracking-wide text-emerald-100/80">Ready</p>
          <p class="mt-2 text-2xl font-semibold text-emerald-100">{{ transactionImport.preview.value?.summary.ready ?? 0 }}</p>
        </article>
        <article class="rounded-base border border-amber-400/30 bg-amber-500/10 p-4">
          <p class="text-xs uppercase tracking-wide text-amber-100/80">Review required</p>
          <p class="mt-2 text-2xl font-semibold text-amber-100">{{ transactionImport.preview.value?.summary.reviewRequired ?? 0 }}</p>
        </article>
        <article class="rounded-base border border-rose-400/30 bg-rose-500/10 p-4">
          <p class="text-xs uppercase tracking-wide text-rose-100/80">Invalid</p>
          <p class="mt-2 text-2xl font-semibold text-rose-100">{{ transactionImport.preview.value?.summary.invalid ?? 0 }}</p>
        </article>
        <article class="rounded-base border border-border-default bg-bg-card p-4">
          <p class="text-xs uppercase tracking-wide text-text-muted">Duplicates</p>
          <p class="mt-2 text-2xl font-semibold text-text-primary">{{ transactionImport.preview.value?.summary.duplicate ?? 0 }}</p>
        </article>
      </div>

      <div v-if="parserIssues.length > 0" class="rounded-base border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        <p class="font-medium">
          {{ form.sourceFormat === 'bank_pdf_text' ? 'PDF statement feedback' : 'Parser feedback' }}
        </p>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          <li v-for="issue in parserIssues" :key="`${issue.code}-${issue.message}`">{{ issue.message }}</li>
        </ul>
      </div>

      <div v-if="previewRows.length === 0" class="rounded-base border border-dashed border-border-default bg-bg-primary p-6 text-sm text-text-muted">
        No preview yet. Generate a preview to inspect row status, approve review-required items, and prepare a commit.
      </div>

      <div v-else class="overflow-x-auto rounded-base border border-border-default">
        <table class="min-w-full divide-y divide-border-default text-sm">
          <thead class="bg-bg-primary text-left text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th class="px-4 py-3">Approve</th>
              <th class="px-4 py-3">Row</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Date</th>
              <th class="px-4 py-3">Description</th>
              <th class="px-4 py-3">Amount</th>
              <th class="px-4 py-3">Issues</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-default bg-bg-card text-text-primary">
            <tr v-for="row in previewRows" :key="row.rowNumber" class="align-top">
              <td class="px-4 py-3">
                <input
                  type="checkbox"
                  :checked="transactionImport.approvalState.value[row.rowNumber] === true"
                  :disabled="row.status === 'invalid' || row.status === 'duplicate'"
                  @change="transactionImport.setRowApproved(row.rowNumber, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td class="px-4 py-3 text-text-secondary">{{ row.rowNumber }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="statusToneClass[getImportStatusPresentation(row.status).tone]"
                >
                  {{ getImportStatusPresentation(row.status).label }}
                </span>
                <p class="mt-1 text-xs text-text-muted">
                  {{ getImportStatusPresentation(row.status).description }}
                </p>
              </td>
              <td class="px-4 py-3 text-text-secondary">{{ row.normalized.date ?? '—' }}</td>
              <td class="px-4 py-3">{{ row.normalized.description ?? '—' }}</td>
              <td class="px-4 py-3 text-text-secondary">{{ row.normalized.amount ?? '—' }}</td>
              <td class="px-4 py-3">
                <ul class="space-y-1 text-xs text-text-secondary">
                  <li v-if="row.issues.length === 0">No issues.</li>
                  <li v-for="issue in row.issues" :key="`${row.rowNumber}-${issue.code}-${issue.message}`">
                    {{ issue.message }}
                  </li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <template #actions>
        <div class="flex-1 space-y-1 text-sm text-text-secondary">
          <p>{{ approvedRowCount }} row(s) currently approved for commit.</p>
          <p v-if="commitDisabledReason" class="text-amber-100">{{ commitDisabledReason }}</p>
          <p v-if="transactionImport.commitError.value" class="text-rose-100">
            {{ transactionImport.commitError.value.message }}
          </p>
        </div>

        <button
          type="button"
          class="inline-flex items-center justify-center rounded-base border border-border-default px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary"
          @click="handlePreview"
        >
          Refresh preview
        </button>

        <button
          type="button"
          class="inline-flex items-center justify-center rounded-base bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="commitDisabledReason !== null"
          @click="handleCommit"
        >
          {{ transactionImport.commitLoading.value ? 'Committing…' : 'Commit approved rows' }}
        </button>
      </template>
    </ResponsiveFormSection>

    <div
      v-if="transactionImport.commitResult.value"
      class="rounded-base border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100"
    >
      <p class="font-medium">Import committed successfully.</p>
      <p class="mt-1">
        Created {{ transactionImport.commitResult.value.createdCount }} transaction(s) in batch
        <span class="font-mono">{{ transactionImport.commitResult.value.batchId }}</span>.
      </p>
    </div>
  </div>
</template>
