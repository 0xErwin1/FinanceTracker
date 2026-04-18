<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Pencil, Trash2 } from 'lucide-vue-next';
import { trpc } from '@/api/trpc';
import { useGoals } from '@/composables/useGoals';
import Badge from '@/components/base/Badge.vue';
import InsightCard from '@/components/base/InsightCard.vue';
import ProgressBar from '@/components/base/ProgressBar.vue';
import { formatCurrency } from '@/utils/format';

interface GoalItem {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  currency: string;
  targetDate: string;
  [key: string]: unknown;
}

interface Props {
  goal: GoalItem | null;
  loading: boolean;
}

const props = defineProps<Props>();
const router = useRouter();
const { refetch } = useGoals();

const confirmDelete = ref(false);
const deleting = ref(false);
const deleteError = ref<string | null>(null);

const percentage = computed(() => {
  if (!props.goal || props.goal.targetAmount <= 0) return 0;
  return Math.min((props.goal.currentAmount / props.goal.targetAmount) * 100, 100);
});

const daysRemaining = computed(() => {
  if (!props.goal) return 0;
  const now = new Date();
  const target = new Date(props.goal.targetDate);
  return Math.max(Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)), 0);
});

const insightMessage = computed(() => {
  if (!props.goal) return '';
  const pct = percentage.value;
  if (pct >= 90) {
    return 'Spending is well within limits this quarter. Maintain current pace to stay under budget.';
  }
  if (pct >= 70) {
    return 'Approaching spending cap. Consider reducing discretionary expenses for the remainder of the period.';
  }
  return 'Spending is significantly under the limit. You have room to allocate funds if needed.';
});

const periodLabel = computed(() => {
  if (!props.goal) return '';
  return `${daysRemaining.value} days remaining`;
});

const deltaText = computed(() => {
  if (!props.goal) return '';
  const remaining = props.goal.targetAmount - props.goal.currentAmount;
  return remaining > 0 ? `${formatCurrency(remaining, props.goal.currency)} remaining` : 'Within budget';
});

async function handleDelete() {
  if (!props.goal) return;

  deleting.value = true;
  deleteError.value = null;

  try {
    await trpc.financialGoal.delete.mutate({ id: props.goal.id });
    await refetch();
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : 'Failed to delete goal';
    confirmDelete.value = false;
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div
    class="rounded-base border border-border-default bg-bg-card p-5"
    :style="{ minHeight: '466px' }"
  >
    <template v-if="loading">
      <div class="animate-pulse space-y-4">
        <div class="h-4 w-24 rounded bg-bg-primary" />
        <div class="h-6 w-40 rounded bg-bg-primary" />
        <div class="h-20 w-full rounded-base bg-bg-primary" />
        <div class="h-3 w-full rounded bg-bg-primary" />
        <div class="h-24 w-full rounded-base bg-bg-primary" />
      </div>
    </template>

    <template v-else-if="goal">
      <!-- Badge + Title + Actions -->
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Badge text="SPEND LIMIT" variant="warning" />
        <h2 class="text-lg font-semibold text-text-primary">
          {{ goal.name }}
        </h2>

        <div class="flex items-center gap-1 sm:ml-auto">
          <button
            class="p-1 rounded-base text-text-muted hover:text-text-primary transition-colors"
            title="Edit"
            @click="router.push(`/goals/${goal.id}/edit`)"
          >
            <Pencil :size="14" />
          </button>
          <button
            class="p-1 rounded-base text-text-muted hover:text-accent-red transition-colors"
            title="Delete"
            @click="confirmDelete = true"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </div>

      <!-- Delete confirmation -->
      <div v-if="confirmDelete" class="mb-4 flex flex-col gap-2 text-xs sm:flex-row sm:items-center">
        <span class="text-text-muted">Delete this goal?</span>
        <button
          class="text-accent-red font-medium"
          :disabled="deleting"
          @click="handleDelete"
        >
          Yes, delete
        </button>
        <button
          class="text-text-muted hover:text-text-primary"
          @click="confirmDelete = false"
        >
          Cancel
        </button>
      </div>

      <div
        v-if="deleteError"
        class="mb-4 text-xs text-accent-red"
      >
        {{ deleteError }}
      </div>

      <!-- Spent this quarter -->
      <div class="mb-4 rounded-base bg-bg-primary p-3">
        <p class="text-xs font-medium tracking-wider text-text-muted">
          SPENT THIS QUARTER
        </p>
        <p class="mt-1 font-mono text-xl font-bold text-accent-orange">
          {{ formatCurrency(goal.currentAmount, goal.currency) }}
        </p>
        <p class="mt-1 text-xs text-text-muted">
          {{ deltaText }}
        </p>
      </div>

      <!-- Budget period + progress -->
      <div class="mb-4">
        <div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Badge :text="periodLabel" variant="info" />
          <span class="font-mono text-xs text-text-muted">
            {{ percentage.toFixed(0) }}%
          </span>
        </div>
        <ProgressBar
          :value="goal.currentAmount"
          :max="goal.targetAmount"
          color="bg-accent-orange"
        />
      </div>

      <!-- Terminal Insight -->
      <InsightCard
        title="Terminal Insight"
        :message="insightMessage"
        severity="info"
      />
    </template>

    <template v-else>
      <div class="flex h-full items-center justify-center py-16">
        <p class="text-sm text-text-muted">No spending limit goal found</p>
      </div>
    </template>
  </div>
</template>
