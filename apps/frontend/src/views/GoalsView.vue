<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Plus } from 'lucide-vue-next';
import { useGoals } from '@/composables/useGoals';
import StatCard from '@/components/base/StatCard.vue';
import MainSavingGoal from './goals/MainSavingGoal.vue';
import SpendingLimitGoal from './goals/SpendingLimitGoal.vue';
import SecondaryGoalsGrid from './goals/SecondaryGoalsGrid.vue';
import ProjectionsAnalytics from './goals/ProjectionsAnalytics.vue';

const router = useRouter();

/** Goal item shape matching tRPC FinancialGoalDTO. */
interface GoalItem {
  id: string;
  name: string;
  type: string;
  note: string | null;
  currentAmount: number;
  targetAmount: number;
  currency: string;
  targetDate: string;
  [key: string]: unknown;
}

const { goals, loading } = useGoals();

/** Normalize goal list with safe defaults. */
const goalList = computed<GoalItem[]>(() => {
  const items = goals.value;
  if (!Array.isArray(items)) return [];
  return items.map((g) => ({
    id: (g as GoalItem).id ?? '',
    name: (g as GoalItem).name ?? '',
    type: (g as GoalItem).type ?? '',
    note: (g as GoalItem).note ?? null,
    currentAmount: Number((g as GoalItem).currentAmount ?? 0),
    targetAmount: Number((g as GoalItem).targetAmount ?? 0),
    currency: String((g as GoalItem).currency ?? 'USD'),
    targetDate: String((g as GoalItem).targetDate ?? ''),
  }));
});

/** First SAVING goal — the "main" goal. */
const mainSavingGoal = computed(() => goalList.value.find((g) => g.type === 'SAVING') ?? null);

/** First SPEND_LESS goal — the spending limit. */
const spendingLimitGoal = computed(() => goalList.value.find((g) => g.type === 'SPEND_LESS') ?? null);

/** Secondary goals: all goals excluding the primary ones shown in main sections. */
const secondaryGoals = computed(() => {
  const mainIds = new Set<string>();
  if (mainSavingGoal.value) mainIds.add(mainSavingGoal.value.id);
  if (spendingLimitGoal.value) mainIds.add(spendingLimitGoal.value.id);
  return goalList.value.filter((g) => !mainIds.has(g.id));
});

/** Total saved across all goals. */
const totalSaved = computed(() => goalList.value.reduce((sum, g) => sum + g.currentAmount, 0));

/** Currency from the primary goal (or USD fallback). */
const primaryCurrency = computed(() => mainSavingGoal.value?.currency ?? 'USD');
</script>

<template>
  <div class="space-y-4">
    <!-- Section 1: Header + New Goal button -->
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm text-text-secondary">Track & plan</p>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-semibold text-text-primary">
            Financial Goals
          </h1>
          <button
            class="flex items-center gap-1.5 rounded-base bg-accent-gold px-3 py-1.5 text-sm font-medium text-bg-primary hover:opacity-90 transition-opacity"
            @click="router.push('/goals/create')"
          >
            <Plus :size="14" />
            New Goal
          </button>
        </div>
      </div>

      <template v-if="loading">
        <div class="h-[83px] w-52 animate-pulse rounded-base bg-bg-card" />
      </template>
      <StatCard
        v-else
        title="Total Saved"
        :value="
          new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: primaryCurrency,
            minimumFractionDigits: 2,
          }).format(totalSaved)
        "
        subtitle="Across all goals"
      />
    </div>

    <!-- Section 2: Main bento grid (2/3 + 1/3) -->
    <div class="grid grid-cols-[2fr_1fr] gap-4">
      <MainSavingGoal
        :goal="mainSavingGoal"
        :loading="loading"
      />
      <SpendingLimitGoal
        :goal="spendingLimitGoal"
        :loading="loading"
      />
    </div>

    <!-- Section 3: Secondary goals -->
    <SecondaryGoalsGrid
      :goals="secondaryGoals"
      :loading="loading"
    />

    <!-- Section 4: Projections & Analytics -->
    <ProjectionsAnalytics
      :goal="mainSavingGoal"
      :loading="loading"
    />
  </div>
</template>
