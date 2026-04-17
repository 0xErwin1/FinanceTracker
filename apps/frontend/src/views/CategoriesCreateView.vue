<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, Tag } from 'lucide-vue-next';
import { trpc } from '@/api/trpc';
import { TransactionType } from '@expenses/api';

const router = useRouter();

// --- Form state ---
const formName = ref('');
const formType = ref<TransactionType>(TransactionType.EXPENSE);
const formColor = ref('#4ade80');
const formNote = ref('');
const formIcon = ref('');
const formError = ref<string | null>(null);
const creating = ref(false);

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
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <button
        class="p-1.5 rounded-base text-text-muted hover:text-text-primary transition-colors"
        title="Back to Categories"
        @click="router.push('/categories')"
      >
        <ArrowLeft :size="20" />
      </button>
      <Tag :size="24" class="text-accent-gold" />
      <h1 class="text-xl font-semibold text-text-primary">New Category</h1>
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
          <label class="block text-sm text-text-secondary">Name</label>
          <input
            v-model="formName"
            type="text"
            required
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50"
            placeholder="Category name"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Type</label>
          <select
            v-model="formType"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50"
          >
            <option :value="TransactionType.EXPENSE">Expense</option>
            <option :value="TransactionType.INCOME">Income</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Color</label>
          <input
            v-model="formColor"
            type="color"
            class="w-full h-10 rounded-base border border-border-default bg-bg-card cursor-pointer"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm text-text-secondary">Icon</label>
          <input
            v-model="formIcon"
            type="text"
            class="w-full rounded-base border border-border-default bg-bg-card px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50"
            placeholder="e.g. shopping-cart"
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
