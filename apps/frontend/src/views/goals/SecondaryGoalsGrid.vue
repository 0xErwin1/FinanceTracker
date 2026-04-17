<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Pencil, Trash2 } from 'lucide-vue-next';
import { trpc } from '@/api/trpc';
import { useGoals } from '@/composables/useGoals';
import ProgressBar from '@/components/base/ProgressBar.vue';
import { formatCurrency, formatDate } from '@/utils/format';

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
  goals: GoalItem[];
  loading: boolean;
}

const props = defineProps<Props>();
const router = useRouter();
const { refetch } = useGoals();

const confirmDeleteId = ref('');
const deleting = ref(false);
const deleteError = ref<string | null>(null);

const cards = computed(() =>
  props.goals.slice(0, 3).map((g) => ({
    ...g,
    percentage: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
  })),
);

async function handleDelete(id: string) {
  deleting.value = true;
  deleteError.value = null;

  try {
    await trpc.financialGoal.delete.mutate({ id });
    await refetch();
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : 'Failed to delete goal';
  } finally {
    confirmDeleteId.value = '';
    deleting.value = false;
  }
}
</script>

<template>
  <div>
    <div v-if="loading" class="grid grid-cols-3 gap-4">
      <div
        v-for="i in 3"
        :key="i"
        class="animate-pulse rounded-base border border-border-default bg-bg-card p-4"
      >
        <div class="h-4 w-24 rounded bg-bg-primary mb-3" />
        <div class="h-6 w-32 rounded bg-bg-primary mb-3" />
        <div class="h-2 w-full rounded bg-bg-primary" />
      </div>
    </div>

    <div v-else-if="cards.length > 0" class="grid grid-cols-3 gap-4">
      <div
        v-for="goal in cards"
        :key="goal.id"
        class="rounded-base border border-border-default bg-bg-card p-4"
      >
        <div class="mb-1 flex items-start justify-between">
          <p class="text-sm font-medium text-text-primary">
            {{ goal.name }}
          </p>

          <div class="flex items-center gap-1">
            <button
              class="p-1 rounded-base text-text-muted hover:text-text-primary transition-colors"
              title="Edit"
              @click="router.push(`/goals/${goal.id}/edit`)"
            >
              <Pencil :size="12" />
            </button>
            <button
              class="p-1 rounded-base text-text-muted hover:text-accent-red transition-colors"
              title="Delete"
              @click="confirmDeleteId = goal.id"
            >
              <Trash2 :size="12" />
            </button>
          </div>
        </div>

        <!-- Delete confirmation (inline) -->
        <div
          v-if="confirmDeleteId === goal.id"
          class="mb-2 flex items-center gap-2 text-xs"
        >
          <span class="text-text-muted">Delete?</span>
          <button
            class="text-accent-red font-medium"
            :disabled="deleting"
            @click="handleDelete(goal.id)"
          >
            Yes
          </button>
          <button
            class="text-text-muted hover:text-text-primary"
            @click="confirmDeleteId = ''"
          >
            No
          </button>
        </div>

        <p class="mb-2 font-mono text-lg font-semibold text-text-primary">
          {{ formatCurrency(goal.currentAmount, goal.currency) }}
          <span class="text-xs text-text-muted">
            / {{ formatCurrency(goal.targetAmount, goal.currency) }}
          </span>
        </p>

        <ProgressBar
          :value="goal.currentAmount"
          :max="goal.targetAmount"
          color="bg-accent-green"
        />

        <p class="mt-2 text-xs text-text-muted">
          Due {{ formatDate(goal.targetDate) }}
        </p>
      </div>
    </div>

    <div
      v-else
      class="rounded-base border border-border-default bg-bg-card p-8 text-center"
    >
      <p class="text-sm text-text-muted">No secondary goals</p>
    </div>

    <div
      v-if="deleteError"
      class="mt-2 text-xs text-accent-red"
    >
      {{ deleteError }}
    </div>
  </div>
</template>
