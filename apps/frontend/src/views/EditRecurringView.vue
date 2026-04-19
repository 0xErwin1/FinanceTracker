<script setup lang="ts">
import type { CategoryDTO } from '@expenses/api';
import { CurrencyEnum, TransactionType } from '@expenses/api';
import { ArrowLeft, Repeat } from 'lucide-vue-next';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { trpc } from '@/api/trpc';
import ResponsiveFormSection from '@/components/base/ResponsiveFormSection.vue';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import { useAccounts } from '@/composables/useAccounts';
import { useCategories } from '@/composables/useCategories';
import { useRecurring } from '@/composables/useRecurring';

const router = useRouter();
const route = useRoute();
const { categories: rawCategories } = useCategories();
const { accountsForCurrency } = useAccounts();
const { refetch } = useRecurring();

// --- Form state ---
const formType = ref<TransactionType>(TransactionType.EXPENSE);
const formAmount = ref<number>(0);
const formCurrency = ref<CurrencyEnum>(CurrencyEnum.USD);
const formAccountId = ref('');
const formCategoryId = ref('');
const formDayOfMonth = ref(1);
const formNote = ref('');
const formStartDate = ref('');
const formEndDate = ref('');
const formError = ref<string | null>(null);
const saving = ref(false);
const loadingItem = ref(true);

const fieldClass =
  'w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50';

const dateFieldClass = `${fieldClass} [color-scheme:dark]`;

const recurringId = route.params.id as string;

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

onMounted(async () => {
  try {
    const item = await trpc.recurring.getById.query({ id: recurringId });

    formType.value = item.type as TransactionType;
    formAmount.value = item.amount;
    formCurrency.value = item.currency as CurrencyEnum;
    formAccountId.value = item.accountId ?? '';
    formCategoryId.value = item.categoryId ?? '';
    formDayOfMonth.value = item.dayOfMonth;
    formNote.value = item.note ?? '';
    formStartDate.value = item.startDate ?? '';
    formEndDate.value = item.endDate ?? '';
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to load recurring transaction';
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

  if (!formAccountId.value) {
    formError.value = 'Account is required.';
    return;
  }

  saving.value = true;

  try {
    await trpc.recurring.update.mutate({
      id: recurringId,
      type: formType.value,
      amount: formAmount.value,
      currency: formCurrency.value,
      accountId: formAccountId.value,
      categoryId: formCategoryId.value || null,
      note: formNote.value || null,
      dayOfMonth: formDayOfMonth.value,
      startDate: formStartDate.value || undefined,
      endDate: formEndDate.value || null,
    });

    await refetch();
    await router.push('/recurring');
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to update recurring transaction';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="space-y-4 lg:space-y-6">
    <ResponsivePageHeader
      title="Edit Recurring Transaction"
      subtitle="Update recurring transaction details without losing access to fields or actions on smaller screens."
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
          <input v-model="formStartDate" type="date" :class="dateFieldClass" />
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
            :disabled="saving"
            class="w-full rounded-base border border-border-default px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary disabled:opacity-50 sm:w-auto"
            @click="router.push('/recurring')"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="w-full rounded-base bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-primary transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </template>
      </ResponsiveFormSection>
    </form>
  </div>
</template>
