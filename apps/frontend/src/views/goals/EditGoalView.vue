<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import { trpc } from '@/api/trpc';
import ResponsiveFormSection from '@/components/base/ResponsiveFormSection.vue';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import { useGoals } from '@/composables/useGoals';
import { CurrencyEnum, FinancialGoalsType } from '@expenses/api';

const router = useRouter();
const route = useRoute();
const { refetch } = useGoals();

const goalId = route.params.id as string;

// --- Form state ---
const formType = ref<FinancialGoalsType>(FinancialGoalsType.SAVING);
const formName = ref('');
const formTargetAmount = ref<number>(0);
const formCurrency = ref<CurrencyEnum>(CurrencyEnum.USD);
const formTargetDate = ref('');
const formNote = ref('');
const formError = ref<string | null>(null);
const saving = ref(false);
const loadingItem = ref(true);

const fieldClass =
  'w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50';

const dateFieldClass = `${fieldClass} [color-scheme:dark]`;

onMounted(async () => {
  try {
    const item = await trpc.financialGoal.getById.query({ id: goalId });

    formType.value = item.type as FinancialGoalsType;
    formName.value = item.name ?? '';
    formTargetAmount.value = Number(item.targetAmount);
    formCurrency.value = item.currency as CurrencyEnum;
    formTargetDate.value = item.targetDate ?? '';
    formNote.value = item.note ?? '';
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to load financial goal';
  } finally {
    loadingItem.value = false;
  }
});

async function handleSave() {
  formError.value = null;

  if (!formTargetAmount.value || formTargetAmount.value <= 0) {
    formError.value = 'Target amount must be greater than 0.';
    return;
  }

  saving.value = true;

  try {
    await trpc.financialGoal.update.mutate({
      id: goalId,
      type: formType.value,
      name: formName.value,
      targetAmount: formTargetAmount.value,
      currency: formCurrency.value,
      targetDate: formTargetDate.value,
      note: formNote.value || null,
    });

    await refetch();
    await router.push('/goals');
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to update financial goal';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="space-y-4 lg:space-y-6">
    <ResponsivePageHeader
      title="Edit Financial Goal"
      subtitle="Update goal fields with the same mobile-safe responsive form pattern used across create and edit flows."
    >
      <template #actions>
        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-base border border-border-default px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary sm:w-auto"
          title="Back to Goals"
          @click="router.push('/goals')"
        >
          <ArrowLeft :size="16" />
          Back to Goals
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
        title="Goal details"
        description="Goal fields stack on mobile, expand to two columns on tablet, and use wider groupings on desktop."
        :columns="3"
      >
        <div v-if="formError" class="rounded-base border border-accent-red/30 bg-accent-red/10 px-4 py-3 shell:col-span-2 xl:col-span-3">
          <p class="text-sm text-accent-red">{{ formError }}</p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Type</label>
          <select v-model="formType" :class="fieldClass">
            <option :value="FinancialGoalsType.SAVING">Saving</option>
            <option :value="FinancialGoalsType.SPEND_LESS">Spend Less</option>
          </select>
        </div>

        <div class="space-y-1.5 xl:col-span-2">
          <label class="block text-sm text-text-secondary">Name</label>
          <input
            v-model="formName"
            type="text"
            required
            :class="fieldClass"
            placeholder="Goal name"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Target Amount</label>
          <input
            v-model.number="formTargetAmount"
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
          <label class="block text-sm text-text-secondary">Target Date</label>
          <input v-model="formTargetDate" type="date" :class="dateFieldClass" />
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
            @click="router.push('/goals')"
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
