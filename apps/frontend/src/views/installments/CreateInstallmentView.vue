<script setup lang="ts">
import { CurrencyEnum } from '@expenses/api';
import { ArrowLeft } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { trpc } from '@/api/trpc';
import ResponsiveFormSection from '@/components/base/ResponsiveFormSection.vue';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import { useAccounts } from '@/composables/useAccounts';
import { useCategories } from '@/composables/useCategories';
import { useInstallments } from '@/composables/useInstallments';
import {
  createInstallmentPlanDraft,
  reconcileInstallmentAccountSelection,
  validateInstallmentPlanDraft,
} from './installmentPlanForm';

const router = useRouter();
const { categories } = useCategories();
const { accountsForCurrency, defaultAccountIdForCurrency, activeAccounts } = useAccounts();
const { refetch } = useInstallments();

const today = new Date().toISOString().split('T')[0];

const form = ref(createInstallmentPlanDraft(today, defaultAccountIdForCurrency(CurrencyEnum.USD)));
const saving = ref(false);
const formError = ref<string | null>(null);

const fieldClass =
  'w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50';

const dateFieldClass = `${fieldClass} [color-scheme:dark]`;

const categoryOptions = computed(() => (Array.isArray(categories.value) ? categories.value : []));
const accountOptions = computed(() => accountsForCurrency(form.value.currency));
const hasAccounts = computed(() => activeAccounts.value.length > 0);

watch(
  () => form.value.currency,
  (currency) => {
    form.value.accountId = reconcileInstallmentAccountSelection(
      form.value.accountId,
      accountsForCurrency(currency),
    );
  },
  { immediate: true },
);

async function submit(goBack: boolean) {
  formError.value = validateInstallmentPlanDraft(form.value);

  if (formError.value) {
    return;
  }

  saving.value = true;

  try {
    await trpc.installment.createPlan.mutate({
      totalAmount: Number(form.value.totalAmount),
      currency: form.value.currency,
      accountId: form.value.accountId,
      installmentsCount: form.value.installmentsCount,
      categoryId: form.value.categoryId || undefined,
      note: form.value.note || undefined,
      startDate: form.value.startDate,
    });

    await refetch();

    if (goBack) {
      await router.push('/installments');
      return;
    }

    form.value = createInstallmentPlanDraft(today, defaultAccountIdForCurrency(CurrencyEnum.USD));
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to create installment plan.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="space-y-4 lg:space-y-6">
    <ResponsivePageHeader
      title="New Installment Plan"
      subtitle="Create an account-linked plan first so each paid obligation lands in the correct account history."
    >
      <template #actions>
        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-base border border-border-default px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary sm:w-auto"
          @click="router.push('/installments')"
        >
          <ArrowLeft :size="16" />
          Back to Installments
        </button>
      </template>
    </ResponsivePageHeader>

    <form class="space-y-4" @submit.prevent="submit(true)">
      <ResponsiveFormSection
        title="Installment details"
        description="This plan creates monthly obligations, and every paid obligation reuses the selected account."
        :columns="3"
      >
        <div
          v-if="!hasAccounts"
          class="rounded-base border border-dashed border-border-default px-4 py-3 text-sm text-text-muted shell:col-span-2 xl:col-span-3"
        >
          Create an account first in
          <button type="button" class="text-accent-gold underline" @click="router.push('/accounts')">
            Accounts
          </button>
          before creating a new installment plan.
        </div>

        <div
          v-if="formError"
          class="rounded-base border border-accent-red/30 bg-accent-red/10 px-4 py-3 shell:col-span-2 xl:col-span-3"
        >
          <p class="text-sm text-accent-red">{{ formError }}</p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Total amount</label>
          <input
            v-model="form.totalAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            :class="fieldClass"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Currency</label>
          <select v-model="form.currency" :class="fieldClass">
            <option :value="CurrencyEnum.USD">USD</option>
            <option :value="CurrencyEnum.UYU">UYU</option>
            <option :value="CurrencyEnum.EUR">EUR</option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Account</label>
          <select v-model="form.accountId" :class="fieldClass">
            <option value="">Select account</option>
            <option v-for="account in accountOptions" :key="account.id" :value="account.id">
              {{ account.name }}
            </option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Installments</label>
          <input
            v-model.number="form.installmentsCount"
            type="number"
            min="2"
            step="1"
            placeholder="12"
            :class="fieldClass"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Category</label>
          <select v-model="form.categoryId" :class="fieldClass">
            <option value="">None</option>
            <option v-for="category in categoryOptions" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Start date</label>
          <input v-model="form.startDate" type="date" :class="dateFieldClass" />
        </div>

        <div class="space-y-1.5 xl:col-span-2">
          <label class="block text-sm text-text-secondary">Note</label>
          <input
            v-model="form.note"
            type="text"
            placeholder="Laptop financing"
            :class="fieldClass"
          />
        </div>

        <template #actions>
          <button
            type="button"
            :disabled="saving || !hasAccounts"
            class="w-full rounded-base border border-border-default px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary disabled:opacity-50 sm:w-auto"
            @click="submit(false)"
          >
            {{ saving ? 'Creating...' : 'Create & Add Another' }}
          </button>
          <button
            type="submit"
            :disabled="saving || !hasAccounts"
            class="w-full rounded-base bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-primary transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {{ saving ? 'Creating...' : 'Create & Go Back' }}
          </button>
        </template>
      </ResponsiveFormSection>
    </form>
  </div>
</template>
