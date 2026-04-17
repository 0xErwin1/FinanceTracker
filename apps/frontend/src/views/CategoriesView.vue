<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCategories } from '@/composables/useCategories';
import { trpc } from '@/api/trpc';
import type { CategoryDTO } from '@expenses/api';
import type { TransactionType } from '@expenses/api';
import { Plus, Trash2, Tag, Check, X, Pencil } from 'lucide-vue-next';

const router = useRouter();
const { categories: rawCategories, loading, error, refetch } = useCategories();

const categoryList = computed<CategoryDTO[]>(() => {
  const items = rawCategories.value;
  return Array.isArray(items) ? (items as CategoryDTO[]) : [];
});

// --- Delete state ---
const deletingId = ref<string | null>(null);
const deleteError = ref<string | null>(null);

async function handleDelete(id: string) {
  if (deletingId.value === id) {
    deleteError.value = null;

    try {
      await trpc.category.delete.mutate({
        id,
        deleteTransactions: false,
      });
      await refetch();
    } catch (err) {
      deleteError.value = err instanceof Error ? err.message : 'Failed to delete category';
      return;
    }

    deletingId.value = null;
  } else {
    deletingId.value = id;
    deleteError.value = null;
  }
}

function cancelDelete() {
  deletingId.value = null;
  deleteError.value = null;
}

// --- Inline edit state ---
const editingId = ref<string | null>(null);
const editForm = ref({
  name: '',
  type: '' as string,
  color: '',
  note: '',
});
const editError = ref<string | null>(null);
const editSaving = ref(false);

function startEdit(cat: CategoryDTO) {
  editingId.value = cat.id;
  editForm.value = {
    name: cat.name,
    type: cat.type,
    color: cat.color ?? '',
    note: cat.note ?? '',
  };
  editError.value = null;
}

function cancelEdit() {
  editingId.value = null;
  editError.value = null;
}

async function saveEdit(id: string) {
  editError.value = null;

  if (!editForm.value.name.trim()) {
    editError.value = 'Name is required.';
    return;
  }

  editSaving.value = true;

  try {
    await trpc.category.update.mutate({
      id,
      name: editForm.value.name,
      type: editForm.value.type as TransactionType,
      color: editForm.value.color || null,
      note: editForm.value.note || null,
    });

    editingId.value = null;
    await refetch();
  } catch (err) {
    editError.value = err instanceof Error ? err.message : 'Failed to update category';
  } finally {
    editSaving.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Tag :size="24" class="text-accent-gold" />
        <h1 class="text-xl font-semibold text-text-primary">Categories</h1>
      </div>
      <button
        class="flex items-center gap-2 bg-accent-gold text-bg-primary font-semibold text-sm py-2 px-4 rounded-base hover:opacity-90 transition-opacity"
        @click="router.push('/categories/create')"
      >
        <Plus :size="16" />
        New Category
      </button>
    </div>

    <!-- Loading state -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <div class="w-6 h-6 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm rounded-base px-4 py-3"
    >
      Failed to load categories.
    </div>

    <!-- Category list -->
    <div v-else class="bg-bg-surface border border-border-default rounded-base overflow-hidden">
      <table class="w-full">
        <thead>
          <tr class="border-b border-border-default">
            <th class="text-left text-xs font-medium text-text-muted px-5 py-3">
              Name
            </th>
            <th class="text-left text-xs font-medium text-text-muted px-5 py-3">
              Type
            </th>
            <th class="text-left text-xs font-medium text-text-muted px-5 py-3">
              Color
            </th>
            <th class="text-left text-xs font-medium text-text-muted px-5 py-3">
              Note
            </th>
            <th class="text-right text-xs font-medium text-text-muted px-5 py-3">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="cat in categoryList"
            :key="cat.id"
            class="border-b border-border-default last:border-b-0 hover:bg-bg-card-hover transition-colors"
          >
            <!-- Name -->
            <td class="px-5 py-3 text-sm text-text-primary">
              <input
                v-if="editingId === cat.id"
                v-model="editForm.name"
                type="text"
                class="w-full rounded-base border border-border-default bg-bg-card px-2 py-1 text-sm text-text-primary outline-none focus:border-accent-gold/50"
              />
              <span v-else>{{ cat.name }}</span>
            </td>

            <!-- Type -->
            <td class="px-5 py-3">
              <select
                v-if="editingId === cat.id"
                v-model="editForm.type"
                class="rounded-base border border-border-default bg-bg-card px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-gold/50"
              >
                <option value="INCOME">INCOME</option>
                <option value="EXPENSE">EXPENSE</option>
              </select>
              <span
                v-else
                class="text-xs px-2 py-0.5 rounded-base font-mono"
                :class="
                  cat.type === 'INCOME'
                    ? 'bg-accent-green/10 text-accent-green'
                    : 'bg-accent-red/10 text-accent-red'
                "
              >
                {{ cat.type }}
              </span>
            </td>

            <!-- Color -->
            <td class="px-5 py-3">
              <input
                v-if="editingId === cat.id"
                v-model="editForm.color"
                type="color"
                class="w-8 h-8 rounded border border-border-default cursor-pointer bg-transparent"
              />
              <template v-else>
                <span
                  v-if="cat.color"
                  class="inline-block w-4 h-4 rounded-sm"
                  :style="{ backgroundColor: cat.color }"
                />
                <span v-else class="text-text-muted text-xs">--</span>
              </template>
            </td>

            <!-- Note -->
            <td class="px-5 py-3 text-sm text-text-muted truncate max-w-[200px]">
              <input
                v-if="editingId === cat.id"
                v-model="editForm.note"
                type="text"
                class="w-full rounded-base border border-border-default bg-bg-card px-2 py-1 text-sm text-text-primary outline-none focus:border-accent-gold/50"
              />
              <span v-else>{{ cat.note || '--' }}</span>
            </td>

            <!-- Actions -->
            <td class="px-5 py-3 text-right">
              <!-- Editing mode -->
              <div v-if="editingId === cat.id" class="flex items-center justify-end gap-1">
                <div
                  v-if="editError"
                  class="text-xs text-accent-red truncate max-w-[120px] mr-1"
                  :title="editError"
                >
                  {{ editError }}
                </div>
                <button
                  :disabled="editSaving"
                  class="p-1 text-accent-green hover:text-accent-green/80 transition-colors disabled:opacity-50"
                  title="Save changes"
                  @click="saveEdit(cat.id)"
                >
                  <Check :size="14" />
                </button>
                <button
                  class="p-1 text-text-muted hover:text-text-primary transition-colors"
                  title="Cancel edit"
                  @click="cancelEdit"
                >
                  <X :size="14" />
                </button>
              </div>

              <!-- Delete confirm -->
              <div v-else-if="deleteError && deletingId === cat.id" class="flex items-center justify-end gap-2">
                <span
                  class="text-xs text-accent-red truncate max-w-[160px]"
                  :title="deleteError"
                >
                  {{ deleteError }}
                </span>
                <button
                  class="p-1 text-text-muted hover:text-text-primary transition-colors"
                  title="Dismiss"
                  @click="cancelDelete"
                >
                  <X :size="14" />
                </button>
              </div>
              <div v-else-if="deletingId === cat.id" class="flex items-center justify-end gap-1">
                <button
                  class="p-1 text-accent-red hover:text-accent-red/80 transition-colors"
                  title="Confirm delete"
                  @click="handleDelete(cat.id)"
                >
                  <Check :size="14" />
                </button>
                <button
                  class="p-1 text-text-muted hover:text-text-primary transition-colors"
                  title="Cancel"
                  @click="cancelDelete"
                >
                  <X :size="14" />
                </button>
              </div>

              <!-- Default actions -->
              <div v-else class="flex items-center justify-end gap-1">
                <button
                  class="p-1 text-text-muted hover:text-accent-gold transition-colors"
                  title="Edit category"
                  @click="startEdit(cat)"
                >
                  <Pencil :size="16" />
                </button>
                <button
                  class="p-1 text-text-muted hover:text-accent-red transition-colors"
                  title="Delete category"
                  @click="handleDelete(cat.id)"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="categoryList.length === 0">
            <td
              colspan="5"
              class="px-5 py-8 text-center text-sm text-text-muted"
            >
              No categories yet. Click "New Category" to create one.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
