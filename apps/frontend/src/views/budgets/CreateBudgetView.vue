<script setup lang="ts">
import { ArrowLeft, PieChart } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { trpc } from '@/api/trpc';
import ResponsiveFormSection from '@/components/base/ResponsiveFormSection.vue';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import { useBudgets } from '@/composables/useBudgets';
import { useCategories } from '@/composables/useCategories';

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

const fieldClass =
  'w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50';

const monthFieldClass = `${fieldClass} [color-scheme:dark]`;

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
  <div class="space-y-4 lg:space-y-6">
    <ResponsivePageHeader
      title="New Budget"
      subtitle="Create category budgets with a mobile-safe form and full-width actions on smaller screens."
    >
      <template #actions>
        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-base border border-border-default px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary sm:w-auto"
          title="Back to Budgets"
          @click="router.push('/budgets')"
        >
          <ArrowLeft :size="16" />
          Back to Budgets
        </button>
      </template>
    </ResponsivePageHeader>

    <form class="space-y-4" @submit.prevent="handleCreateAndGoBack">
      <ResponsiveFormSection
        title="Budget configuration"
        description="Fields collapse to one column on mobile and expand to two columns at tablet widths."
        :columns="2"
      >
        <div v-if="formError" class="rounded-base border border-accent-red/30 bg-accent-red/10 px-4 py-3 shell:col-span-2">
          <p class="text-sm text-accent-red">{{ formError }}</p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Category</label>
          <select v-model="formCategoryId" required :class="fieldClass">
            <option value="" disabled>Select category</option>
            <option
              v-for="cat in expenseCategories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </option>
          </select>
          <p v-if="expenseCategories.length === 0" class="text-xs text-text-muted">
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
            :class="fieldClass"
            placeholder="0.00"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Month</label>
          <input v-model="formMonth" type="month" required :class="monthFieldClass" />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Alert Threshold (%)</label>
          <input
            v-model="formAlertThreshold"
            type="number"
            min="0"
            max="100"
            :class="fieldClass"
            placeholder="80"
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
