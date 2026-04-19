<script setup lang="ts">
import { CurrencyEnum, TransactionType } from '@expenses/api';
import { ArrowLeft } from 'lucide-vue-next';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { trpc } from '@/api/trpc';
import ResponsiveFormSection from '@/components/base/ResponsiveFormSection.vue';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import { useAccounts } from '@/composables/useAccounts';
import { useCategories } from '@/composables/useCategories';
import { useTransactions } from '@/composables/useTransactions';
import { getTransferConstraintMessage, resolveTransferAccountOptions } from './transferForm';

const router = useRouter();
const route = useRoute();
const { categories } = useCategories();
const { refetch, updateTransfer } = useTransactions();
const { accounts, postingAccountsForCurrency } = useAccounts();

const transactionId = route.params.id as string;

// --- Form state ---
const formType = ref<TransactionType>(TransactionType.EXPENSE);
const formAmount = ref<number>(0);
const formCurrency = ref<CurrencyEnum>(CurrencyEnum.USD);
const formCategoryId = ref('');
const formAccountId = ref('');
const formDate = ref('');
const formNote = ref('');
const transferGroupId = ref<string | null>(null);
const transferCounterpartyName = ref<string | null>(null);
const transferSourceAccountId = ref('');
const transferDestinationAccountId = ref('');
const formError = ref<string | null>(null);
const saving = ref(false);
const loadingItem = ref(true);

const fieldClass =
  'w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent-gold/50';

const dateFieldClass = `${fieldClass} [color-scheme:dark]`;

const isTransfer = computed(() => transferGroupId.value !== null);

const accountOptions = computed(() => postingAccountsForCurrency(formCurrency.value));
const transferOptions = computed(() =>
  resolveTransferAccountOptions(
    accounts.value,
    formCurrency.value,
    transferSourceAccountId.value || undefined,
  ),
);
const transferConstraintMessage = computed(() =>
  getTransferConstraintMessage(transferOptions.value, formCurrency.value),
);

const filteredCategoryOptions = computed(() => {
  const items = categories.value;
  if (!Array.isArray(items)) return [];
  const all = items as Array<{ id: string; name: string; type?: string }>;

  if (formType.value === TransactionType.EXPENSE) return all.filter((c) => c.type === 'EXPENSE');
  if (formType.value === TransactionType.INCOME) return all.filter((c) => c.type === 'INCOME');
  return all;
});

watch(formType, () => {
  if (isTransfer.value) {
    return;
  }

  if (formCategoryId.value) {
    const valid = filteredCategoryOptions.value.some((c) => c.id === formCategoryId.value);
    if (!valid) {
      formCategoryId.value = '';
    }
  }
});

watch(formCurrency, (currency) => {
  const availableAccounts = postingAccountsForCurrency(currency);

  if (isTransfer.value) {
    if (transferSourceAccountId.value !== transferOptions.value.selectedSourceAccountId) {
      transferSourceAccountId.value = transferOptions.value.selectedSourceAccountId;
    }

    if (
      !transferOptions.value.destinationAccounts.some(
        (account) => account.id === transferDestinationAccountId.value,
      )
    ) {
      transferDestinationAccountId.value = transferOptions.value.destinationAccounts[0]?.id ?? '';
    }

    return;
  }

  if (!availableAccounts.some((account) => account.id === formAccountId.value)) {
    formAccountId.value = availableAccounts[0]?.id ?? '';
  }
});

function assignTransferAccounts(item: {
  accountId: string | null;
  counterpartyAccountId?: string | null;
  transferDirection?: 'OUTGOING' | 'INCOMING' | null;
}) {
  if (item.transferDirection === 'INCOMING') {
    transferSourceAccountId.value = item.counterpartyAccountId ?? '';
    transferDestinationAccountId.value = item.accountId ?? '';
    return;
  }

  transferSourceAccountId.value = item.accountId ?? '';
  transferDestinationAccountId.value = item.counterpartyAccountId ?? '';
}

onMounted(async () => {
  try {
    const item = await trpc.transaction.getById.query({ id: transactionId });

    formType.value = item.type as TransactionType;
    formAmount.value = Number(item.amount);
    formCurrency.value = item.currency as CurrencyEnum;
    formAccountId.value = item.accountId ?? '';
    formCategoryId.value = item.categoryId ?? '';
    formDate.value = item.date ?? '';
    formNote.value = item.note ?? '';
    transferGroupId.value = item.transferGroupId ?? null;
    transferCounterpartyName.value = item.counterpartyAccount?.name ?? null;

    if (item.transferGroupId) {
      assignTransferAccounts(item);
    }
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to load transaction';
  } finally {
    loadingItem.value = false;
  }
});

async function handleSave() {
  formError.value = null;

  if (!formAmount.value || formAmount.value <= 0) {
    formError.value = 'Amount must be greater than 0.';
    return;
  }

  if (!isTransfer.value && !formAccountId.value) {
    formError.value = 'Account is required.';
    return;
  }

  saving.value = true;

  try {
    if (isTransfer.value) {
      if (!transferSourceAccountId.value || !transferDestinationAccountId.value) {
        formError.value = 'Source and destination accounts are required for transfers.';
        return;
      }

      if (transferSourceAccountId.value === transferDestinationAccountId.value) {
        formError.value = 'Source and destination accounts must differ.';
        return;
      }

      if (!formDate.value) {
        formError.value = 'Date is required.';
        return;
      }

      await updateTransfer({
        transactionId,
        sourceAccountId: transferSourceAccountId.value,
        destinationAccountId: transferDestinationAccountId.value,
        amount: formAmount.value,
        currency: formCurrency.value,
        date: formDate.value,
        note: formNote.value || undefined,
      });
    } else {
      await trpc.transaction.update.mutate({
        id: transactionId,
        type: formType.value,
        amount: formAmount.value,
        currency: formCurrency.value,
        accountId: formAccountId.value,
        categoryId: formCategoryId.value || null,
        date: formDate.value || undefined,
        note: formNote.value || null,
      });
    }

    await refetch();
    await router.push('/transactions');
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to update transaction';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="space-y-4 lg:space-y-6">
    <ResponsivePageHeader
      title="Edit Transaction"
      subtitle="Keep fields, validation, and save actions reachable across mobile, tablet, and desktop layouts."
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

    <!-- Loading -->
    <div
      v-if="loadingItem"
      class="flex items-center justify-center py-12"
    >
      <div class="w-6 h-6 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Form card -->
    <form
      v-else
      class="space-y-4"
      @submit.prevent="handleSave"
    >
      <ResponsiveFormSection
        title="Transaction details"
        description="The edit form collapses to one column on mobile and expands to denser groupings as space allows."
        :columns="3"
      >
        <div v-if="formError" class="rounded-base border border-accent-red/30 bg-accent-red/10 px-4 py-3 shell:col-span-2 xl:col-span-3">
          <p class="text-sm text-accent-red">{{ formError }}</p>
        </div>

        <div v-if="transferGroupId" class="rounded-base border border-border-default/60 bg-bg-primary/60 px-4 py-3 shell:col-span-2 xl:col-span-3">
          <p class="text-sm text-text-primary">Transfer pair detected</p>
          <p class="mt-1 text-xs text-text-muted">
            This edit updates both transfer legs together so the movement stays balanced {{ transferCounterpartyName ? `with ${transferCounterpartyName}` : 'between accounts' }}.
          </p>
        </div>

        <div v-if="isTransfer && transferConstraintMessage" class="rounded-base border border-accent-red/30 bg-accent-red/10 px-4 py-3 shell:col-span-2 xl:col-span-3">
          <p class="text-sm text-accent-red">
            {{ transferConstraintMessage }}
          </p>
        </div>

        <div v-if="!isTransfer" class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Type</label>
          <select v-model="formType" :class="fieldClass">
            <option :value="TransactionType.EXPENSE">Expense</option>
            <option :value="TransactionType.INCOME">Income</option>
            <option :value="TransactionType.SAVING">Saving</option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Amount</label>
          <input
            v-model.number="formAmount"
            type="number"
            step="0.01"
            min="0"
            required
            :class="dateFieldClass"
            placeholder="0.00"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Currency</label>
          <select v-model="formCurrency" :class="fieldClass">
            <option :value="CurrencyEnum.USD">USD</option>
            <option :value="CurrencyEnum.UYU">UYU</option>
            <option :value="CurrencyEnum.EUR">EUR</option>
          </select>
        </div>

        <div v-if="!isTransfer" class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Account</label>
          <select v-model="formAccountId" :class="fieldClass">
            <option value="">Select account</option>
            <option v-for="account in accountOptions" :key="account.id" :value="account.id">
              {{ account.name }}
            </option>
          </select>
        </div>

        <div v-else class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Source account</label>
          <select v-model="transferSourceAccountId" :class="fieldClass">
            <option value="">Select source account</option>
            <option v-for="account in transferOptions.sourceAccounts" :key="`${account.id}-source`" :value="account.id">
              {{ account.name }}
            </option>
          </select>
        </div>

        <div v-if="isTransfer" class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Destination account</label>
          <select v-model="transferDestinationAccountId" :class="fieldClass">
            <option value="">Select destination account</option>
            <option
              v-for="account in transferOptions.destinationAccounts"
              :key="`${account.id}-destination`"
              :value="account.id"
            >
              {{ account.name }}
            </option>
          </select>
        </div>

        <div v-if="!isTransfer" class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Category</label>
          <select v-model="formCategoryId" :class="fieldClass">
            <option value="">None</option>
            <option
              v-for="cat in filteredCategoryOptions"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Date</label>
          <input v-model="formDate" type="date" :class="dateFieldClass" />
        </div>

        <div class="space-y-1.5 xl:col-span-2">
          <label class="block text-sm text-text-secondary">Note</label>
          <input
            v-model="formNote"
            type="text"
            :class="fieldClass"
            placeholder="Optional note"
          />
        </div>

        <template #actions>
          <button
            type="button"
            :disabled="saving"
            class="w-full rounded-base border border-border-default px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary disabled:opacity-50 sm:w-auto"
            @click="router.push('/transactions')"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="w-full rounded-base bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-primary transition-colors hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </template>
      </ResponsiveFormSection>
    </form>
  </div>
</template>
