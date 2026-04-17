<script setup lang="ts">
import { computed } from 'vue';
import DataTable from '@/components/base/DataTable.vue';
import Badge from '@/components/base/Badge.vue';
import ProgressBar from '@/components/base/ProgressBar.vue';
import { formatCurrency, formatDate } from '@/utils/format';

/** Transaction item shape matching tRPC TransactionDTO. */
interface TransactionItem {
  id: string;
  date: string;
  note: string | null;
  amount: number;
  currency: string;
  type: string;
  category?: { name: string; color?: string | null } | null;
  [key: string]: unknown;
}

/** Goal item shape matching tRPC FinancialGoalDTO. */
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
  transactions: TransactionItem[];
  goals: GoalItem[];
  loading: boolean;
}

const props = defineProps<Props>();

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'note', label: 'Description' },
  { key: 'category', label: 'Category', align: 'center' as const },
  { key: 'amount', label: 'Amount', align: 'right' as const },
];

/** Most recent 4 transactions, sorted by date descending. */
const recentRows = computed(() =>
  props.transactions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4)
    .map((t) => ({
      id: t.id,
      date: t.date,
      note: t.note ?? 'No description',
      category: t.category?.name ?? 'Uncategorized',
      categoryColor: t.category?.color,
      amount: t.amount,
      currency: t.currency,
      type: t.type,
    })),
);

/** Top 3 goals with computed percentage. */
const topGoals = computed(() =>
  props.goals
    .slice(0, 3)
    .map((g) => ({
      ...g,
      percentage:
        g.targetAmount > 0
          ? Math.round((g.currentAmount / g.targetAmount) * 100)
          : 0,
    })),
);

function badgeVariant(pct: number): 'success' | 'warning' | 'info' {
  if (pct >= 80) return 'success';
  if (pct >= 40) return 'warning';
  return 'info';
}
</script>

<template>
  <div class="grid grid-cols-[2fr_1fr] gap-4">
    <!-- Loading skeleton -->
    <template v-if="loading">
      <div class="animate-pulse rounded-base border border-border-default bg-bg-card p-5">
        <div class="mb-4 h-4 w-44 rounded bg-bg-primary" />
        <div class="space-y-3">
          <div class="h-10 rounded bg-bg-primary" />
          <div class="h-10 rounded bg-bg-primary" />
          <div class="h-10 rounded bg-bg-primary" />
          <div class="h-10 rounded bg-bg-primary" />
        </div>
      </div>
      <div class="animate-pulse rounded-base border border-border-default bg-bg-card p-5">
        <div class="space-y-4">
          <div class="h-24 rounded-base bg-bg-primary" />
          <div class="h-24 rounded-base bg-bg-primary" />
          <div class="h-24 rounded-base bg-bg-primary" />
        </div>
      </div>
    </template>

    <!-- Content -->
    <template v-else>
      <!-- Left card: Recent Transactions -->
      <div
        class="rounded-base border border-border-default bg-bg-card p-5"
      >
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-medium text-text-primary">
            Recent Transactions
          </h3>
          <span class="text-text-muted">&#8250;</span>
        </div>

        <DataTable
          v-if="recentRows.length > 0"
          :columns="columns"
          :rows="recentRows"
        >
          <template #date="{ value }">
            <span class="text-xs text-text-secondary">
              {{ formatDate(value as string) }}
            </span>
          </template>

          <template #note="{ value }">
            <span class="text-xs text-text-primary">
              {{ value }}
            </span>
          </template>

          <template #category="{ value }">
            <Badge :text="String(value)" variant="default" />
          </template>

          <template #amount="{ row }">
            <span
              :class="[
                'font-mono text-sm font-medium',
                (row as Record<string, unknown>).type === 'INCOME'
                  ? 'text-accent-green'
                  : 'text-accent-red',
              ]"
            >
              {{ (row as Record<string, unknown>).type === 'INCOME' ? '+' : '-' }}{{
                formatCurrency(
                  Number((row as Record<string, unknown>).amount),
                  String((row as Record<string, unknown>).currency),
                )
              }}
            </span>
          </template>
        </DataTable>

        <div
          v-else
          class="py-8 text-center text-xs text-text-muted"
        >
          No recent transactions
        </div>
      </div>

      <!-- Right card: Goals Progress -->
      <div
        class="rounded-base border border-border-default bg-bg-card p-5"
      >
        <h3 class="mb-4 text-sm font-medium text-text-primary">
          Goals Progress
        </h3>

        <div
          v-if="topGoals.length === 0"
          class="py-4 text-center text-xs text-text-muted"
        >
          No goals set
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="goal in topGoals"
            :key="goal.id"
            class="rounded-base bg-bg-primary p-3"
          >
            <div class="mb-1 flex items-center justify-between">
              <span class="truncate text-xs font-medium text-text-primary">
                {{ goal.name }}
              </span>
              <Badge
                :text="`${goal.percentage}%`"
                :variant="badgeVariant(goal.percentage)"
              />
            </div>

            <p class="mb-2 font-mono text-sm text-text-primary">
              {{ formatCurrency(goal.currentAmount, goal.currency) }}
              <span class="text-text-muted">
                / {{ formatCurrency(goal.targetAmount, goal.currency) }}
              </span>
            </p>

            <ProgressBar
              :value="goal.currentAmount"
              :max="goal.targetAmount"
              color="bg-accent-green"
            />

            <p class="mt-1.5 text-xs text-text-muted">
              Due {{ formatDate(goal.targetDate) }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
