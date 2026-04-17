<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, PieChart } from 'lucide-vue-next';
import { trpc } from '@/api/trpc';
import { useCategories } from '@/composables/useCategories';
import { useBudgets } from '@/composables/useBudgets';

const router = useRouter();
const { categories: rawCategories } = useCategories();
const { refetch } = useBudgets();

// --- Form state ---
const formCategoryId = ref('');
const formAmount = ref('');
const formMonth = ref(new Date().toISOString().slice(0, 7));
const formAlertThreshold = ref('80');
const formError = ref<string | null>(null);
const creating = ref(false);

/** All categories from the composable. */
const categoryOptions = computed(() => {
  const items = rawCategories.value;
  if (!Array.isArray(items)) return [];
  return (items as Array<{ id: string; name: string; type: string }>).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
  }));
});

/** Filter to expense-only categories. */
const expenseCategories = computed(() => categoryOptions.value.filter((c) => c.type === 'EXPENSE'));

function resetForm() {
  formCategoryId.value = '';
  formAmount.value = '';
  formMonth.value = new Date().toISOString().slice(0, 7);
  formAlertThreshold.value = '80';
  formError.value = null;
}

async function handleCreateAndGoBack() {
  formError.value = null;

  if (!formCategoryId.value) {
    formError.value = 'Select a category.';
    return;
  }
  if (!formAmount.value || Number(formAmount.value) <= 0) {
    formError.value = 'Enter a valid amount greater than zero.';
    return;
  }

  creating.value = true;

  try {
    await trpc.budget.create.mutate({
      categoryId: formCategoryId.value,
      month: formMonth.value,
      amount: Number(formAmount.value),
      alertThreshold: formAlertThreshold.value ? Number(formAlertThreshold.value) : undefined,
    });

    await refetch();
    await router.push('/budgets');
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to create budget';
  } finally {
    creating.value = false;
  }
}

async function handleCreateAndAddAnother() {
  formError.value = null;

  if (!formCategoryId.value) {
    formError.value = 'Select a category.';
    return;
  }
  if (!formAmount.value || Number(formAmount.value) <= 0) {
    formError.value = 'Enter a valid amount greater than zero.';
    return;
  }

  creating.value = true;

  try {
    await trpc.budget.create.mutate({
      categoryId: formCategoryId.value,
      month: formMonth.value,
      amount: Number(formAmount.value),
      alertThreshold: formAlertThreshold.value ? Number(formAlertThreshold.value) : undefined,
    });

    resetForm();
    await refetch();
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to create budget';
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <button
        class="p-1.5 rounded-base text-text-muted hover:text-text-primary transition-colors"
        title="Back to Budgets"
        @click="router.push('/budgets')"
      >
        <ArrowLeft :size="20" />
      </button>
      <PieChart :size="24" class="text-accent-gold" />
      <h1 class="text-xl font-semibold text-text-primary">New Budget</h1>
    </div>

    <!-- Form card -->
    <form
      class="bg-bg-surface border border-border-default rounded-base p-5 space-y-4"
      @submit.prevent="handleCreateAndGoBack"
    >
      <div
        v-if="formError"
        class="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-base px-4 py-3"
      >
        {{ formError }}
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Category</label>
          <select
            v-model="formCategoryId"
            required
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
          >
            <option value="" disabled>Select category</option>
            <option
              v-for="cat in expenseCategories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </option>
          </select>
          <p
            v-if="expenseCategories.length === 0"
            class="text-xs text-text-muted"
          >
            No expense categories available.
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Budget Limit</label>
          <input
            v-model="formAmount"
            type="number"
            step="0.01"
            min="0"
            required
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50"
            placeholder="0.00"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Month</label>
          <input
            v-model="formMonth"
            type="month"
            required
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Alert Threshold (%)</label>
          <input
            v-model="formAlertThreshold"
            type="number"
            min="0"
            max="100"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50"
            placeholder="80"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button
          type="button"
          :disabled="creating"
          class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          @click="handleCreateAndAddAnother"
        >
          {{ creating ? 'Creating...' : 'Create & Add Another' }}
        </button>
        <button
          type="submit"
          :disabled="creating"
          class="px-4 py-2 text-sm bg-accent-gold text-bg-primary font-semibold rounded-base hover:opacity-90 disabled:opacity-50"
        >
          {{ creating ? 'Creating...' : 'Create & Go Back' }}
        </button>
      </div>
    </form>
  </div>
</template>
