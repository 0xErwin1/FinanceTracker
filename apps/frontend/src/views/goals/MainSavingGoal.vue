<script setup lang="ts">
import { Pencil, Trash2 } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { trpc } from '@/api/trpc';
import Badge from '@/components/base/Badge.vue';
import ProgressBar from '@/components/base/ProgressBar.vue';
import { useGoals } from '@/composables/useGoals';
import { formatCurrency, formatDate } from '@/utils/format';

interface GoalItem {
  id: string;
  name: string;
  note: string | null;
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

const remaining = computed(() => {
  if (!props.goal) return 0;
  return Math.max(props.goal.targetAmount - props.goal.currentAmount, 0);
});

const monthsToTarget = computed(() => {
  if (!props.goal) return 0;
  const now = new Date();
  const target = new Date(props.goal.targetDate);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30));
});

const monthlyVelocity = computed(() => {
  if (!props.goal || monthsToTarget.value <= 0) return 0;
  return remaining.value / monthsToTarget.value;
});

const riskLevel = computed<'Nominal' | 'Caution' | 'At Risk'>(() => {
  if (!props.goal) return 'Nominal';
  if (percentage.value >= 70) return 'Nominal';
  if (percentage.value >= 40) return 'Caution';
  return 'At Risk';
});

const riskVariant = computed(() => {
  switch (riskLevel.value) {
    case 'Nominal':
      return 'success' as const;
    case 'Caution':
      return 'warning' as const;
    case 'At Risk':
      return 'danger' as const;
  }
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
    :style="{ minHeight: '463px' }"
  >
    <template v-if="loading">
      <div class="animate-pulse space-y-4">
        <div class="h-4 w-32 rounded bg-bg-primary" />
        <div class="h-6 w-52 rounded bg-bg-primary" />
        <div class="flex gap-4">
          <div class="h-20 w-40 rounded-base bg-bg-primary" />
          <div class="h-20 w-40 rounded-base bg-bg-primary" />
        </div>
        <div class="h-3 w-full rounded bg-bg-primary" />
        <div class="flex gap-4">
          <div class="h-16 w-32 rounded-base bg-bg-primary" />
          <div class="h-16 w-32 rounded-base bg-bg-primary" />
          <div class="h-16 w-32 rounded-base bg-bg-primary" />
        </div>
      </div>
    </template>

    <template v-else-if="goal">
      <!-- Badge + Title + Actions -->
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Badge text="SAVING" variant="success" />
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

      <p v-if="goal.note" class="mb-4 text-xs text-text-muted">
        {{ goal.note }}
      </p>

      <!-- Two metric columns -->
      <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="rounded-base bg-bg-primary p-3">
          <p class="text-xs font-medium tracking-wider text-text-muted">
            CURRENT BALANCE
          </p>
          <p class="mt-1 font-mono text-xl font-bold text-text-primary">
            {{ formatCurrency(goal.currentAmount, goal.currency) }}
          </p>
        </div>
        <div class="rounded-base bg-bg-primary p-3">
          <p class="text-xs font-medium tracking-wider text-text-muted">
            TARGET GOAL
          </p>
          <p class="mt-1 font-mono text-xl font-bold text-accent-gold">
            {{ formatCurrency(goal.targetAmount, goal.currency) }}
          </p>
        </div>
      </div>

      <!-- Progress section -->
      <div class="mb-4">
        <ProgressBar
          :value="goal.currentAmount"
          :max="goal.targetAmount"
          color="bg-accent-green"
          label="Progress"
        />
      </div>

      <!-- Sub-metrics row -->
      <div class="grid grid-cols-1 gap-3 shell:grid-cols-2 xl:grid-cols-3">
        <div class="rounded-base bg-bg-primary p-3">
          <p class="text-xs font-medium tracking-wider text-text-muted">
            MONTHLY VELOCITY
          </p>
          <p class="mt-1 font-mono text-sm font-semibold text-accent-green">
            +{{ formatCurrency(monthlyVelocity, goal.currency) }}
          </p>
        </div>

        <div class="rounded-base bg-bg-primary p-3">
          <p class="text-xs font-medium tracking-wider text-text-muted">
            AT THIS RATE
          </p>
          <p class="mt-1 font-mono text-sm font-semibold text-text-primary">
            {{ monthsToTarget > 0 ? `${formatDate(goal.targetDate)}` : 'Overdue' }}
          </p>
        </div>

        <div class="rounded-base bg-bg-primary p-3">
          <p class="text-xs font-medium tracking-wider text-text-muted">
            RISK LEVEL
          </p>
          <p class="mt-1">
            <Badge :text="riskLevel" :variant="riskVariant" />
          </p>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="flex h-full items-center justify-center py-16">
        <p class="text-sm text-text-muted">No savings goal found</p>
      </div>
    </template>
  </div>
</template>
