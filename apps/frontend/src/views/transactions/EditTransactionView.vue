<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import { trpc } from '@/api/trpc';
import { useCategories } from '@/composables/useCategories';
import { useTransactions } from '@/composables/useTransactions';
import { TransactionType, CurrencyEnum } from '@expenses/api';

const router = useRouter();
const route = useRoute();
const { categories } = useCategories();
const { refetch } = useTransactions();

const transactionId = route.params.id as string;

// --- Form state ---
const formType = ref<TransactionType>(TransactionType.EXPENSE);
const formAmount = ref<number>(0);
const formCurrency = ref<CurrencyEnum>(CurrencyEnum.USD);
const formCategoryId = ref('');
const formDate = ref('');
const formNote = ref('');
const formError = ref<string | null>(null);
const saving = ref(false);
const loadingItem = ref(true);

const filteredCategoryOptions = computed(() => {
  const items = categories.value;
  if (!Array.isArray(items)) return [];
  const all = items as Array<{ id: string; name: string; type?: string }>;

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

onMounted(async () => {
  try {
    const item = await trpc.transaction.getById.query({ id: transactionId });

    formType.value = item.type as TransactionType;
    formAmount.value = Number(item.amount);
    formCurrency.value = item.currency as CurrencyEnum;
    formCategoryId.value = item.categoryId ?? '';
    formDate.value = item.date ?? '';
    formNote.value = item.note ?? '';
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

  saving.value = true;

  try {
    await trpc.transaction.update.mutate({
      id: transactionId,
      type: formType.value,
      amount: formAmount.value,
      currency: formCurrency.value,
      categoryId: formCategoryId.value || null,
      date: formDate.value || undefined,
      note: formNote.value || null,
    });

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
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <button
        class="p-1.5 rounded-base text-text-muted hover:text-text-primary transition-colors"
        title="Back to Transactions"
        @click="router.push('/transactions')"
      >
        <ArrowLeft :size="20" />
      </button>
      <h1 class="text-xl font-semibold text-text-primary">Edit Transaction</h1>
    </div>

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
      class="bg-bg-surface border border-border-default rounded-base p-5 space-y-4"
      @submit.prevent="handleSave"
    >
      <div
        v-if="formError"
        class="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-base px-4 py-3"
      >
        {{ formError }}
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Type</label>
          <select
            v-model="formType"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
          >
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
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50"
            placeholder="0.00"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Currency</label>
          <select
            v-model="formCurrency"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
          >
            <option :value="CurrencyEnum.USD">USD</option>
            <option :value="CurrencyEnum.UYU">UYU</option>
            <option :value="CurrencyEnum.EUR">EUR</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Category</label>
          <select
            v-model="formCategoryId"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
          >
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
          <input
            v-model="formDate"
            type="date"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Note</label>
          <input
            v-model="formNote"
            type="text"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50"
            placeholder="Optional note"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button
          type="button"
          :disabled="saving"
          class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          @click="router.push('/transactions')"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="px-4 py-2 text-sm bg-accent-gold text-bg-primary font-semibold rounded-base hover:opacity-90 disabled:opacity-50"
        >
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </form>
  </div>
</template>
