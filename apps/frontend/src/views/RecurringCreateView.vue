<script setup lang="ts">
import type { CategoryDTO } from '@expenses/api';
import { CurrencyEnum, TransactionType } from '@expenses/api';
import { ArrowLeft, Repeat } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { trpc } from '@/api/trpc';
import ResponsiveFormSection from '@/components/base/ResponsiveFormSection.vue';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import { useAccounts } from '@/composables/useAccounts';
import { useCategories } from '@/composables/useCategories';
import { useRecurring } from '@/composables/useRecurring';

const router = useRouter();
const { categories: rawCategories } = useCategories();
const { accountsForCurrency, defaultAccountIdForCurrency } = useAccounts();
const { refetch } = useRecurring();

// --- Form state ---
const formType = ref<TransactionType>(TransactionType.EXPENSE);
const formAmount = ref<number>(0);
const formCurrency = ref<CurrencyEnum>(CurrencyEnum.USD);
const formAccountId = ref(defaultAccountIdForCurrency(CurrencyEnum.USD) ?? '');
const formCategoryId = ref('');
const formDayOfMonth = ref(1);
const formNote = ref('');
const formStartDate = ref(new Date().toISOString().split('T')[0]);
const formEndDate = ref('');
const formError = ref<string | null>(null);
const creating = ref(false);

const fieldClass =
  'w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50';

const dateFieldClass = `${fieldClass} [color-scheme:dark]`;

const filteredCategoryOptions = computed(() => {
  const items = rawCategories.value;
  if (!Array.isArray(items)) return [];
  const all = items as CategoryDTO[];

  if (formType.value === TransactionType.EXPENSE) return all.filter((c) => c.type === 'EXPENSE');
  if (formType.value === TransactionType.INCOME) return all.filter((c) => c.type === 'INCOME');
  return all;
});

watch(formType, () => {
  if (formCategoryId.value) {
    const valid = filteredCategoryOptions.value.some((c) => c.id === formCategoryId.value);
    if (!valid) {
      formCategoryId.value = '';
    }
  }
});

watch(
  formCurrency,
  (currency) => {
    const nextAccounts = accountsForCurrency(currency);
    if (!nextAccounts.some((account) => account.id === formAccountId.value)) {
      formAccountId.value = nextAccounts[0]?.id ?? '';
    }
  },
  { immediate: true },
);

async function handleCreate() {
  formError.value = null;

  if (!formCategoryId.value) {
    formError.value = 'Category is required.';
    return;
  }

  if (!formAmount.value || formAmount.value <= 0) {
    formError.value = 'Amount must be greater than 0.';
    return;
  }

  if (!formAccountId.value) {
    formError.value = 'Account is required.';
    return;
  }

  creating.value = true;

  try {
    await trpc.recurring.create.mutate({
      type: formType.value,
      amount: formAmount.value,
      currency: formCurrency.value,
      accountId: formAccountId.value,
      categoryId: formCategoryId.value || undefined,
      note: formNote.value || undefined,
      dayOfMonth: formDayOfMonth.value,
      startDate: formStartDate.value,
      endDate: formEndDate.value || undefined,
    });

    await refetch();
    await router.push('/recurring');
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to create recurring transaction';
  } finally {
    creating.value = false;
  }
}

async function handleCreateAndAddAnother() {
  formError.value = null;

  if (!formCategoryId.value) {
    formError.value = 'Category is required.';
    return;
  }

  if (!formAmount.value || formAmount.value <= 0) {
    formError.value = 'Amount must be greater than 0.';
    return;
  }

  if (!formAccountId.value) {
    formError.value = 'Account is required.';
    return;
  }

  creating.value = true;

  try {
    await trpc.recurring.create.mutate({
      type: formType.value,
      amount: formAmount.value,
      currency: formCurrency.value,
      accountId: formAccountId.value,
      categoryId: formCategoryId.value || undefined,
      note: formNote.value || undefined,
      dayOfMonth: formDayOfMonth.value,
      startDate: formStartDate.value,
      endDate: formEndDate.value || undefined,
    });

    // Reset form for next entry
    formType.value = TransactionType.EXPENSE;
    formAmount.value = 0;
    formCurrency.value = CurrencyEnum.USD;
    formAccountId.value = defaultAccountIdForCurrency(CurrencyEnum.USD) ?? '';
    formCategoryId.value = '';
    formDayOfMonth.value = 1;
    formNote.value = '';
    formStartDate.value = new Date().toISOString().split('T')[0];
    formEndDate.value = '';

    await refetch();
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to create recurring transaction';
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="space-y-4 lg:space-y-6">
    <ResponsivePageHeader
      title="New Recurring Transaction"
      subtitle="Set up recurring transactions with a form that stays readable and actionable on narrow screens."
    >
      <template #actions>
        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-base border border-border-default px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary sm:w-auto"
          title="Back to Recurring"
          @click="router.push('/recurring')"
        >
          <ArrowLeft :size="16" />
          Back to Recurring
        </button>
      </template>
    </ResponsivePageHeader>

    <form class="space-y-4" @submit.prevent="handleCreate">
      <ResponsiveFormSection
        title="Recurring details"
        description="Fields stack on mobile and expand into denser groups at tablet and desktop breakpoints."
        :columns="3"
      >
        <div v-if="formError" class="rounded-base border border-accent-red/30 bg-accent-red/10 px-4 py-3 shell:col-span-2 xl:col-span-3">
          <p class="text-sm text-accent-red">{{ formError }}</p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Type</label>
          <select v-model="formType" :class="fieldClass">
            <option :value="TransactionType.EXPENSE">Expense</option>
            <option :value="TransactionType.INCOME">Income</option>
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
            :class="fieldClass"
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

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Account</label>
          <select v-model="formAccountId" :class="fieldClass">
            <option value="">Select account</option>
            <option v-for="account in accountsForCurrency(formCurrency)" :key="account.id" :value="account.id">
              {{ account.name }}
            </option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Category *</label>
          <select
            v-model="formCategoryId"
            :class="[fieldClass, !formCategoryId ? '!border-accent-red/50' : '']"
          >
            <option value="" disabled>Select category</option>
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
          <label class="block text-sm text-text-secondary">Day of Month</label>
          <input
            v-model.number="formDayOfMonth"
            type="number"
            min="1"
            max="31"
            required
            :class="fieldClass"
            placeholder="1-31"
          />
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

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Start Date</label>
          <input v-model="formStartDate" type="date" required :class="dateFieldClass" />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">End Date</label>
          <input
            v-model="formEndDate"
            type="date"
            :class="dateFieldClass"
            placeholder="Optional"
          />
        </div>

        <template #actions>
          <button
            type="button"
            :disabled="creating"
            class="w-full rounded-base border border-border-default px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary disabled:opacity-50 sm:w-auto"
            @click="handleCreateAndAddAnother"
          >
            {{ creating ? 'Creating...' : 'Create & Add Another' }}
          </button>
          <button
            type="submit"
            :disabled="creating"
            class="w-full rounded-base bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-primary transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {{ creating ? 'Creating...' : 'Create & Go Back' }}
          </button>
        </template>
      </ResponsiveFormSection>
    </form>
  </div>
</template>
