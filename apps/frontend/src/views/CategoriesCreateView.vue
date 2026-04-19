<script setup lang="ts">
import { TransactionType } from '@expenses/api';
import { ArrowLeft, Tag } from 'lucide-vue-next';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { trpc } from '@/api/trpc';
import ResponsiveFormSection from '@/components/base/ResponsiveFormSection.vue';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';

const router = useRouter();

// --- Form state ---
const formName = ref('');
const formType = ref<TransactionType>(TransactionType.EXPENSE);
const formColor = ref('#4ade80');
const formNote = ref('');
const formIcon = ref('');
const formError = ref<string | null>(null);
const creating = ref(false);

const fieldClass =
  'w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50';

function resetForm() {
  formName.value = '';
  formType.value = TransactionType.EXPENSE;
  formColor.value = '#4ade80';
  formNote.value = '';
  formIcon.value = '';
  formError.value = null;
}

async function handleCreateAndGoBack() {
  formError.value = null;
  creating.value = true;

  try {
    await trpc.category.create.mutate({
      name: formName.value,
      type: formType.value,
      color: formColor.value,
      note: formNote.value,
      icon: formIcon.value || undefined,
    });

    await router.push('/categories');
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to create category';
  } finally {
    creating.value = false;
  }
}

async function handleCreateAndAddAnother() {
  formError.value = null;
  creating.value = true;

  try {
    await trpc.category.create.mutate({
      name: formName.value,
      type: formType.value,
      color: formColor.value,
      note: formNote.value,
      icon: formIcon.value || undefined,
    });

    resetForm();
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to create category';
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <div class="space-y-4 lg:space-y-6">
    <ResponsivePageHeader
      title="New Category"
      subtitle="Create categories with a mobile-safe form and full-width actions on narrow screens."
    >
      <template #actions>
        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-base border border-border-default px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary sm:w-auto"
          title="Back to Categories"
          @click="router.push('/categories')"
        >
          <ArrowLeft :size="16" />
          Back to Categories
        </button>
      </template>
    </ResponsivePageHeader>

    <form class="space-y-4" @submit.prevent="handleCreateAndGoBack">
      <ResponsiveFormSection
        title="Category details"
        description="Category fields stack on mobile and expand into denser groupings on tablet and desktop."
        :columns="3"
      >
        <div v-if="formError" class="rounded-base border border-accent-red/30 bg-accent-red/10 px-4 py-3 shell:col-span-2 xl:col-span-3">
          <p class="text-sm text-accent-red">{{ formError }}</p>
        </div>

        <div class="space-y-1.5 xl:col-span-2">
          <label class="block text-sm text-text-secondary">Name</label>
          <input
            v-model="formName"
            type="text"
            required
            :class="fieldClass"
            placeholder="Category name"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Type</label>
          <select v-model="formType" :class="fieldClass">
            <option :value="TransactionType.EXPENSE">Expense</option>
            <option :value="TransactionType.INCOME">Income</option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Color</label>
          <input
            v-model="formColor"
            type="color"
            class="h-10 w-full rounded-base border border-border-default bg-bg-card cursor-pointer"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Icon</label>
          <input
            v-model="formIcon"
            type="text"
            :class="fieldClass"
            placeholder="e.g. shopping-cart"
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
