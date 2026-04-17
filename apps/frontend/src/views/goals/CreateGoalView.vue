<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, Loader2 } from 'lucide-vue-next';
import { trpc } from '@/api/trpc';
import { useGoals } from '@/composables/useGoals';
import { CurrencyEnum, FinancialGoalsType } from '@expenses/api';

const router = useRouter();
const { refetch } = useGoals();

// --- Form state ---
const formType = ref<FinancialGoalsType>(FinancialGoalsType.SAVING);
const formName = ref('');
const formTargetAmount = ref<number>(0);
const formCurrency = ref<CurrencyEnum>(CurrencyEnum.USD);
const formTargetDate = ref('');
const formNote = ref('');
const formError = ref<string | null>(null);
const saving = ref(false);

async function handleSave() {
  formError.value = null;

  if (!formName.value.trim()) {
    formError.value = 'Name is required.';
    return;
  }

  if (!formTargetAmount.value || formTargetAmount.value <= 0) {
    formError.value = 'Target amount must be greater than 0.';
    return;
  }

  saving.value = true;

  try {
    await trpc.financialGoal.create.mutate({
      type: formType.value,
      name: formName.value,
      targetAmount: formTargetAmount.value,
      currency: formCurrency.value,
      targetDate: formTargetDate.value,
      note: formNote.value || '',
    });

    await refetch();
    await router.push('/goals');
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to create goal';
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
        title="Back to Goals"
        @click="router.push('/goals')"
      >
        <ArrowLeft :size="20" />
      </button>
      <h1 class="text-xl font-semibold text-text-primary">New Financial Goal</h1>
    </div>

    <!-- Form card -->
    <form
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
            <option :value="FinancialGoalsType.SAVING">Saving</option>
            <option :value="FinancialGoalsType.SPEND_LESS">Spend Less</option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Name</label>
          <input
            v-model="formName"
            type="text"
            required
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50"
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
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50"
            placeholder="0.00"
          />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
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

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Target Date</label>
          <input
            v-model="formTargetDate"
            type="date"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50 [color-scheme:dark]"
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
          @click="router.push('/goals')"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="flex items-center gap-1.5 px-4 py-2 text-sm bg-accent-gold text-bg-primary font-semibold rounded-base hover:opacity-90 disabled:opacity-50"
        >
          <Loader2 v-if="saving" :size="14" class="animate-spin" />
          {{ saving ? 'Creating...' : 'Create Goal' }}
        </button>
      </div>
    </form>
  </div>
</template>
