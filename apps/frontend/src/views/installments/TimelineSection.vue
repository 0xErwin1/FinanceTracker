<script setup lang="ts">
import type { InstallmentPlan, TransactionRow } from '@/types';
import Badge from '@/components/base/Badge.vue';
import { formatCurrency, formatDate } from '@/utils/format';

interface Props {
  plans: InstallmentPlan[];
  loading: boolean;
}

defineProps<Props>();

type EntryStatus = 'completed' | 'active' | 'future';

/** Classify a timeline entry based on its position in the plan. */
function entryStatus(
  entry: TransactionRow,
  plan: InstallmentPlan,
): EntryStatus {
  if (plan.paidInstallments >= plan.totalInstallments) return 'completed';
  if (entry.installmentNumber != null && entry.installmentNumber <= plan.paidInstallments) {
    return 'completed';
  }
  if (
    entry.installmentNumber != null &&
    entry.installmentNumber === plan.paidInstallments + 1
  ) {
    return 'active';
  }
  return 'future';
}

/** Dot color class based on status. */
function dotClass(status: EntryStatus): string {
  if (status === 'completed') return 'bg-accent-green';
  if (status === 'active') return 'border-2 border-accent-blue bg-transparent';
  return 'bg-text-muted/40';
}

/** Badge variant for entry status. */
function statusBadgeVariant(status: EntryStatus): 'success' | 'info' | 'default' {
  if (status === 'completed') return 'success';
  if (status === 'active') return 'info';
  return 'default';
}

/** Badge text for entry status. */
function statusBadgeText(status: EntryStatus): string {
  if (status === 'completed') return 'Completed';
  if (status === 'active') return 'Upcoming';
  return 'Pending';
}

/** Whether the entry row should appear muted. */
function isMuted(status: EntryStatus): boolean {
  return status === 'future';
}
</script>

<template>
  <section>
    <!-- Section header -->
    <div class="mb-4 flex items-start justify-between">
      <div>
        <h2 class="text-sm font-medium text-text-primary">
          Detailed Timeline
        </h2>
        <p class="mt-0.5 text-xs text-text-muted">
          Payment schedule and status for all installment plans
        </p>
      </div>

      <!-- Legend -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full bg-accent-green" />
          <span class="text-xs text-text-muted">Completed</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full border-2 border-accent-blue" />
          <span class="text-xs text-text-muted">Active</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full bg-text-muted/40" />
          <span class="text-xs text-text-muted">Future</span>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div
      v-if="loading"
      class="rounded-base border border-border-default bg-bg-card p-5"
    >
      <div
        v-for="i in 4"
        :key="i"
        class="flex gap-4 mb-6 last:mb-0"
      >
        <div class="animate-pulse h-3 w-3 rounded-full bg-bg-primary" />
        <div class="flex-1 space-y-2">
          <div class="h-4 w-48 rounded bg-bg-primary" />
          <div class="h-3 w-32 rounded bg-bg-primary" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="plans.length === 0"
      class="rounded-base border border-border-default bg-bg-card p-8 text-center"
    >
      <p class="text-sm text-text-muted">
        No timeline entries to display.
      </p>
    </div>

    <!-- Timeline per plan -->
    <div
      v-else
      class="space-y-6"
    >
      <div
        v-for="plan in plans"
        :key="plan.planId"
        class="rounded-base border border-border-default bg-bg-card p-5"
      >
        <!-- Plan heading -->
        <h3 class="mb-4 text-sm font-medium text-text-primary">
          {{ plan.description }}
        </h3>

        <!-- Vertical timeline -->
        <div class="relative pl-6">
          <!-- Connecting line -->
          <div class="absolute left-[5px] top-2 bottom-2 w-px bg-border-default" />

          <div
            v-for="(entry, idx) in plan.transactions"
            :key="entry.id"
            class="relative pb-5 last:pb-0"
          >
            <!-- Dot -->
            <span
              :class="[
                dotClass(entryStatus(entry, plan)),
                'absolute -left-6 top-1 h-3 w-3 rounded-full',
              ]"
            />

            <!-- Entry content -->
            <div
              :class="[
                isMuted(entryStatus(entry, plan)) ? 'opacity-40' : '',
                entryStatus(entry, plan) === 'active'
                  ? 'rounded-base border border-accent-blue/20 bg-accent-blue/5 p-3'
                  : '',
              ]"
            >
              <!-- Date + status badge -->
              <div class="mb-1 flex items-center gap-2">
                <span class="text-xs text-text-muted">
                  {{ formatDate(entry.date) }}
                </span>
                <Badge
                  :text="statusBadgeText(entryStatus(entry, plan))"
                  :variant="statusBadgeVariant(entryStatus(entry, plan))"
                />
              </div>

              <!-- Title -->
              <p class="text-sm font-medium text-text-primary">
                {{ entry.description || `Installment ${entry.installmentNumber ?? idx + 1}` }}
              </p>

              <!-- Description (category if available) -->
              <p
                v-if="entry.category"
                class="mt-0.5 text-xs text-text-secondary"
              >
                {{ entry.category }}
              </p>

              <!-- Amount -->
              <p class="mt-1 font-mono text-sm text-text-primary">
                {{ formatCurrency(entry.amount, entry.currency) }}
              </p>

              <!-- Action buttons for active entry -->
              <div
                v-if="entryStatus(entry, plan) === 'active'"
                class="mt-3 flex gap-2"
              >
                <button
                  type="button"
                  class="rounded-base border border-border-default bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary"
                >
                  View Details
                </button>
                <button
                  type="button"
                  class="rounded-base bg-accent-blue/15 px-3 py-1.5 text-xs font-medium text-accent-blue transition-colors hover:bg-accent-blue/25"
                >
                  Pay Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
