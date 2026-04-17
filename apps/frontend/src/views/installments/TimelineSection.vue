<script setup lang="ts">
import type { InstallmentPlan, TransactionRow } from '@/types';
import Badge from '@/components/base/Badge.vue';
import { formatCurrency, formatDate } from '@/utils/format';

interface Props {
  plans: InstallmentPlan[];
  loading: boolean;
}

defineProps<Props>();
const emit = defineEmits<{ pay: [transactionId: string] }>();

type EntryStatus = 'completed' | 'active' | 'future';

/** Classify a timeline entry based on its date relative to today. */
function entryStatus(entry: TransactionRow): EntryStatus {
  const today = new Date().toISOString().split('T')[0];
  const entryDate = entry.date ? entry.date.split('T')[0] : '';

  if (entryDate && entryDate <= today) return 'completed';
  return 'future';
}

/** Dot color class based on status. */
function dotClass(status: EntryStatus): string {
  if (status === 'completed') return 'bg-accent-green';
  return 'bg-text-muted/40';
}

/** Badge variant for entry status. */
function statusBadgeVariant(status: EntryStatus): 'success' | 'default' {
  if (status === 'completed') return 'success';
  return 'default';
}

/** Badge text for entry status. */
function statusBadgeText(status: EntryStatus): string {
  if (status === 'completed') return 'Paid';
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
          <span class="text-xs text-text-muted">Paid</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full bg-text-muted/40" />
          <span class="text-xs text-text-muted">Pending</span>
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
                dotClass(entryStatus(entry)),
                'absolute -left-6 top-1 h-3 w-3 rounded-full',
              ]"
            />

            <!-- Entry content -->
            <div
              :class="[
                isMuted(entryStatus(entry)) ? 'opacity-40' : '',
              ]"
            >
              <!-- Date + status badge -->
              <div class="mb-1 flex items-center gap-2">
                <span class="text-xs text-text-muted">
                  {{ formatDate(entry.date) }}
                </span>
                <Badge
                  :text="statusBadgeText(entryStatus(entry))"
                  :variant="statusBadgeVariant(entryStatus(entry))"
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

              <!-- Pay button for pending installments -->
              <div
                v-if="entryStatus(entry) === 'future'"
                class="mt-3 flex gap-2"
              >
                <button
                  type="button"
                  class="rounded-base bg-accent-blue/15 px-3 py-1.5 text-xs font-medium text-accent-blue transition-colors hover:bg-accent-blue/25"
                  @click="emit('pay', entry.id)"
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
