<script setup lang="ts">
import type { CategoryDTO, TransactionType } from '@expenses/api';
import { Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { trpc } from '@/api/trpc';
import ResponsivePageHeader from '@/components/base/ResponsivePageHeader.vue';
import { useCategories } from '@/composables/useCategories';

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
  <div class="space-y-4 lg:space-y-6">
    <!-- Header -->
    <ResponsivePageHeader
      title="Categories"
      :subtitle="`${categoryList.length} categories configured`"
    >
      <template #actions>
        <button
          class="flex w-full items-center justify-center gap-2 rounded-base bg-accent-gold px-4 py-2 text-sm font-semibold text-bg-primary transition-opacity hover:opacity-90 sm:w-auto"
          @click="router.push('/categories/create')"
        >
          <Plus :size="16" />
          New Category
        </button>
      </template>
    </ResponsivePageHeader>

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
    <div v-else class="space-y-3">
      <div class="space-y-3 shell:hidden">
        <div
          v-for="cat in categoryList"
          :key="`${cat.id}-mobile`"
          class="rounded-base border border-border-default bg-bg-surface p-4"
        >
          <div v-if="editingId === cat.id" class="space-y-3">
            <div v-if="editError" class="text-sm text-accent-red">{{ editError }}</div>
            <input v-model="editForm.name" type="text" class="w-full rounded-base border border-border-default bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50" />
            <select v-model="editForm.type" class="w-full rounded-base border border-border-default bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50">
              <option value="INCOME">INCOME</option>
              <option value="EXPENSE">EXPENSE</option>
            </select>
            <input v-model="editForm.note" type="text" class="w-full rounded-base border border-border-default bg-bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-gold/50" placeholder="Optional note" />
            <div class="flex gap-2">
              <button class="flex-1 rounded-base bg-accent-gold px-3 py-2 text-xs font-medium text-bg-primary" @click="saveEdit(cat.id)">Save</button>
              <button class="flex-1 rounded-base border border-border-default px-3 py-2 text-xs text-text-secondary" @click="cancelEdit">Cancel</button>
            </div>
          </div>

          <div v-else class="space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-text-primary">{{ cat.name }}</p>
                <p class="mt-1 text-xs text-text-muted">{{ cat.note || '--' }}</p>
              </div>
              <span
                class="rounded-base px-2 py-0.5 font-mono text-xs"
                :class="cat.type === 'INCOME' ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'"
              >
                {{ cat.type }}
              </span>
            </div>

            <div class="flex items-center gap-2 text-sm text-text-secondary">
              <span>Color:</span>
              <span v-if="cat.color" class="inline-block h-4 w-4 rounded-sm" :style="{ backgroundColor: cat.color }" />
              <span v-else>--</span>
            </div>

            <div class="flex flex-wrap gap-2">
              <button class="rounded-base border border-border-default px-3 py-2 text-xs text-text-secondary" @click="startEdit(cat)">Edit</button>
              <button v-if="deletingId !== cat.id" class="rounded-base border border-border-default px-3 py-2 text-xs text-accent-red" @click="handleDelete(cat.id)">Delete</button>
            </div>

            <div v-if="deletingId === cat.id" class="flex flex-col gap-2 border-t border-border-default/60 pt-3">
              <p v-if="deleteError" class="text-xs text-accent-red">{{ deleteError }}</p>
              <div class="flex gap-2">
                <button class="flex-1 rounded-base bg-accent-red px-3 py-2 text-xs font-medium text-bg-primary" @click="handleDelete(cat.id)">Confirm Delete</button>
                <button class="flex-1 rounded-base border border-border-default px-3 py-2 text-xs text-text-secondary" @click="cancelDelete">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="categoryList.length === 0"
          class="rounded-base border border-border-default bg-bg-surface px-5 py-8 text-center text-sm text-text-muted"
        >
          No categories yet. Click "New Category" to create one.
        </div>
      </div>

      <div class="app-safe-scroll-x hidden overflow-hidden rounded-base border border-border-default bg-bg-surface shell:block">
      <table class="w-full min-w-[760px]">
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
  </div>
</template>
