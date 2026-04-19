<script setup lang="ts">
import { Check, Pencil, Plus, Trash2, X } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { trpc } from '@/api/trpc';
import Badge from '@/components/base/Badge.vue';
import ProgressBar from '@/components/base/ProgressBar.vue';
import { formatCurrency } from '@/utils/format';
import type { CurrencyAmount } from '../multiCurrency';

interface BudgetCardItem {
  id: string;
  categoryId: string;
  categoryName: string;
  budgeted: number;
  spent: number | null;
  currency: string | null;
  percentage: number | null;
  estimatedSpent: number | null;
  estimatedSpentCurrency: string | null;
  estimatedPercentage: number | null;
  hasMixedSpend: boolean;
  nativeSpent: CurrencyAmount[];
  isOverBudget: boolean;
  isNearLimit: boolean;
  alertThreshold: number | null;
  month: string;
}

interface Props {
  budgets: BudgetCardItem[];
  categories: CategoryOption[];
  loading: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
  type: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ refresh: [] }>();
const router = useRouter();

// --- Edit state ---
const editingId = ref<string | null>(null);
const editAmount = ref('');
const editAlertThreshold = ref('');
const editError = ref<string | null>(null);
const saving = ref(false);

// --- Delete state ---
const deletingId = ref<string | null>(null);

function startEdit(budget: BudgetCardItem) {
  editingId.value = budget.id;
  editAmount.value = String(budget.budgeted);
  editAlertThreshold.value = budget.alertThreshold != null ? String(budget.alertThreshold) : '';
  editError.value = null;
}

function cancelEdit() {
  editingId.value = null;
  editError.value = null;
}

async function saveEdit() {
  if (!editingId.value) return;
  editError.value = null;

  if (!editAmount.value || Number(editAmount.value) <= 0) {
    editError.value = 'Enter a valid amount greater than zero.';
    return;
  }

  saving.value = true;

  try {
    await trpc.budget.update.mutate({
      id: editingId.value,
      amount: Number(editAmount.value),
      alertThreshold: editAlertThreshold.value ? Number(editAlertThreshold.value) : null,
    });

    editingId.value = null;
    emit('refresh');
  } catch (err) {
    editError.value = err instanceof Error ? err.message : 'Failed to update budget';
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id: string) {
  if (deletingId.value === id) {
    try {
      await trpc.budget.delete.mutate({ id });
      deletingId.value = null;
      emit('refresh');
    } catch {
      // Silently handle — confirm button will stay visible
    }
  } else {
    deletingId.value = id;
  }
}

function cancelDelete() {
  deletingId.value = null;
}

function statusBadge(item: BudgetCardItem): { text: string; variant: 'success' | 'warning' | 'danger' } {
  if (item.hasMixedSpend) {
    if (item.estimatedPercentage === null) {
      return { text: 'Native Only', variant: 'warning' };
    }

    if (item.estimatedPercentage >= 90) {
      return { text: 'Estimated Caution', variant: 'danger' };
    }

    return { text: 'Estimated', variant: 'warning' };
  }

  const percentage = item.percentage ?? 0;

  if (item.isOverBudget || percentage >= 90) {
    return { text: 'Caution', variant: 'danger' };
  }

  if (item.isNearLimit || percentage >= 70) {
    return { text: 'Near Limit', variant: 'warning' };
  }

  return { text: 'Safe', variant: 'success' };
}

function barColor(pct: number): string {
  if (pct >= 90) return 'bg-accent-red';
  if (pct >= 70) return 'bg-accent-orange';
  return 'bg-accent-green';
}

function formatBudgetValue(amount: number, currency: string | null): string {
  if (!currency) {
    return amount.toFixed(2);
  }

  return formatCurrency(amount, currency);
}

const mixedCurrencyCards = computed(() => props.budgets.filter((budget) => budget.hasMixedSpend));
</script>

<template>
  <div>
    <p class="mb-4 text-xs font-medium tracking-wider text-text-muted">
      BUDGET CATEGORIES
    </p>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-1 gap-4 shell:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="i in 6"
        :key="i"
        class="animate-pulse rounded-base border border-border-default bg-bg-card p-4"
      >
        <div class="mb-3 h-4 w-24 rounded bg-bg-primary" />
        <div class="mb-2 h-3 w-20 rounded bg-bg-primary" />
        <div class="mb-3 h-2 w-full rounded bg-bg-primary" />
        <div class="h-3 w-28 rounded bg-bg-primary" />
      </div>
    </div>

    <!-- Content -->
    <div v-else class="grid grid-cols-1 gap-4 shell:grid-cols-2 xl:grid-cols-3">
      <!-- Budget category cards -->
      <div
        v-for="budget in budgets"
        :key="budget.id"
        class="rounded-base border border-border-default bg-bg-card p-4 transition-colors hover:bg-bg-card-hover"
      >
        <!-- Edit mode -->
        <template v-if="editingId === budget.id">
          <div class="space-y-3">
            <div
              v-if="editError"
              class="bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs rounded-base px-3 py-2"
            >
              {{ editError }}
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs text-text-secondary">Budget Amount</label>
              <input
                v-model="editAmount"
                type="number"
                step="0.01"
                min="0"
                class="w-full rounded-base border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50"
                placeholder="0.00"
              />
            </div>

            <div class="space-y-1.5">
              <label class="block text-xs text-text-secondary">Alert Threshold (%)</label>
              <input
                v-model="editAlertThreshold"
                type="number"
                min="0"
                max="100"
                class="w-full rounded-base border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-gold/50"
                placeholder="80"
              />
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="flex items-center gap-1 rounded-base bg-accent-gold px-3 py-1.5 text-xs font-medium text-bg-primary hover:opacity-90 disabled:opacity-50"
                :disabled="saving"
                @click="saveEdit"
              >
                <Check :size="14" />
                {{ saving ? 'Saving...' : 'Save' }}
              </button>
              <button
                type="button"
                class="flex items-center gap-1 rounded-base bg-bg-primary px-3 py-1.5 text-xs text-text-muted hover:text-text-primary"
                @click="cancelEdit"
              >
                <X :size="14" />
                Cancel
              </button>
            </div>
          </div>
        </template>

        <!-- Display mode -->
        <template v-else>
          <!-- Header: Name + Badge + Actions -->
          <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span class="text-sm font-medium text-text-primary">
              {{ budget.categoryName }}
            </span>

            <div class="flex flex-wrap items-center gap-1.5">
              <Badge
                :text="statusBadge(budget).text"
                :variant="statusBadge(budget).variant"
              />
              <button
                type="button"
                class="p-1 text-text-muted hover:text-accent-gold transition-colors"
                title="Edit budget"
                @click="startEdit(budget)"
              >
                <Pencil :size="14" />
              </button>
            </div>
          </div>

          <!-- Amount + change indicator -->
          <div class="mb-3 flex items-baseline gap-2">
            <template v-if="budget.hasMixedSpend">
              <span
                v-if="budget.estimatedSpent !== null && budget.estimatedSpentCurrency"
                class="font-mono text-lg font-semibold text-text-primary"
              >
                Estimated {{ formatCurrency(budget.estimatedSpent, budget.estimatedSpentCurrency) }}
              </span>
              <span v-else class="text-sm text-text-muted">
                Native subtotals only
              </span>
              <span v-if="budget.estimatedPercentage !== null" class="font-mono text-xs text-accent-gold">
                {{ budget.estimatedPercentage.toFixed(0) }}%
              </span>
            </template>
            <template v-else>
              <span class="font-mono text-lg font-semibold text-text-primary">
                {{ formatBudgetValue(budget.spent ?? 0, budget.currency) }}
              </span>
              <span
                :class="[
                  'font-mono text-xs',
                  (budget.percentage ?? 0) >= 90
                    ? 'text-accent-red'
                    : (budget.percentage ?? 0) >= 70
                      ? 'text-accent-orange'
                      : 'text-accent-green',
                ]"
              >
                {{ (budget.percentage ?? 0).toFixed(0) }}%
              </span>
            </template>
          </div>

          <div v-if="budget.hasMixedSpend" class="space-y-1.5 rounded-base border border-border-default bg-bg-surface px-3 py-2 text-xs text-text-muted">
            <p>Native spent totals</p>
            <p v-for="entry in budget.nativeSpent" :key="`${budget.id}-${entry.currency}`" class="font-mono text-text-primary">
              {{ entry.currency }} {{ formatCurrency(entry.amount, entry.currency) }}
            </p>
          </div>

          <!-- Progress bar -->
          <ProgressBar
            v-else
            :value="budget.spent ?? 0"
            :max="budget.budgeted"
            :color="barColor(budget.percentage ?? 0)"
          />

          <!-- Footer: "$X of $Y" + delete -->
          <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="text-xs text-text-muted">
              <p
                v-if="budget.hasMixedSpend && budget.estimatedSpent !== null && budget.estimatedSpentCurrency"
                class="font-mono"
              >
                Estimated spent {{ formatCurrency(budget.estimatedSpent, budget.estimatedSpentCurrency) }}
              </p>
              <p class="font-mono">
                Limit {{ formatBudgetValue(budget.budgeted, budget.currency) }}
              </p>
            </div>

            <!-- Delete confirmation inline -->
            <template v-if="deletingId === budget.id">
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="text-xs text-accent-red hover:underline"
                  @click="handleDelete(budget.id)"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  class="text-xs text-text-muted hover:underline"
                  @click="cancelDelete"
                >
                  Cancel
                </button>
              </div>
            </template>
            <button
              v-else
              type="button"
              class="p-1 text-text-muted hover:text-accent-red transition-colors"
              title="Delete budget"
              @click="handleDelete(budget.id)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </template>
      </div>

      <button
        v-if="mixedCurrencyCards.length > 0"
        class="col-span-full rounded-base border border-border-default bg-bg-surface px-4 py-3 text-left text-xs text-text-muted"
        type="button"
        disabled
      >
        Mixed-currency budget cards now show native subtotals instead of a false combined spend figure.
      </button>

      <!-- Add New Category button (navigates to create page) -->
      <button
        class="flex min-h-[180px] flex-col items-center justify-center rounded-base border border-dashed border-border-default bg-bg-card p-4 transition-colors hover:bg-bg-card-hover"
        type="button"
        @click="router.push('/budgets/create')"
      >
        <span class="flex h-10 w-10 items-center justify-center rounded-full bg-bg-primary text-lg text-text-muted">
          <Plus :size="20" />
        </span>
        <span class="mt-2 text-xs text-text-muted">
          Add New Category
        </span>
      </button>
    </div>
  </div>
</template>
