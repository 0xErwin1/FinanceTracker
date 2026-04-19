<script setup lang="ts">
import type { InstallmentObligationDTO, InstallmentPlanDTO } from '@expenses/api';
import Badge from '@/components/base/Badge.vue';
import { formatCurrency, formatDate } from '@/utils/format';

interface Props {
  plans: InstallmentPlanDTO[];
  accountLabels: Record<string, string>;
  loading: boolean;
}

defineProps<Props>();
const emit = defineEmits<{ pay: [obligationId: string] }>();

type EntryStatus = 'paid' | 'pending' | 'skipped';

/** Sort key: PENDING first (0), then SKIPPED (1), then PAID (2). */
function obligationSortKey(o: InstallmentObligationDTO): number {
  if (o.status === 'PENDING') return 0;
  if (o.status === 'SKIPPED') return 1;
  return 2;
}

/** Sort obligations so upcoming/pending appear before paid history. */
function sortedObligations(plan: InstallmentPlanDTO): InstallmentObligationDTO[] {
  return [...(plan.obligations ?? [])].sort((a, b) => {
    const keyDiff = obligationSortKey(a) - obligationSortKey(b);
    if (keyDiff !== 0) return keyDiff;
    // Within same status, sort by dueDate ascending
    return a.dueDate.localeCompare(b.dueDate);
  });
}

/** Map obligation status to timeline display status. */
function entryStatus(obligation: InstallmentObligationDTO): EntryStatus {
  if (obligation.status === 'PAID') return 'paid';
  if (obligation.status === 'SKIPPED') return 'skipped';
  return 'pending';
}

/** Dot color class based on status. */
function dotClass(status: EntryStatus): string {
  if (status === 'paid') return 'bg-accent-green';
  if (status === 'skipped') return 'bg-text-muted/60';
  return 'bg-accent-blue/60';
}

/** Badge variant for entry status. */
function statusBadgeVariant(status: EntryStatus): 'success' | 'warning' | 'default' {
  if (status === 'paid') return 'success';
  if (status === 'skipped') return 'warning';
  return 'default';
}

/** Badge text for entry status. */
function statusBadgeText(status: EntryStatus): string {
  if (status === 'paid') return 'Paid';
  if (status === 'skipped') return 'Skipped';
  return 'Pending';
}

/** Whether the entry row should appear muted. */
function isMuted(status: EntryStatus): boolean {
  return status === 'skipped';
}
</script>

<template>
  <section>
    <!-- Section header -->
    <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 class="text-sm font-medium text-text-primary">
        Payment Timeline
      </h2>

      <!-- Legend -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-1">
          <span class="h-1.5 w-1.5 rounded-full bg-accent-blue/60" />
          <span class="text-[10px] text-text-muted">Pending</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="h-1.5 w-1.5 rounded-full bg-accent-green" />
          <span class="text-[10px] text-text-muted">Paid</span>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div
      v-if="loading"
      class="rounded-base border border-border-default bg-bg-card p-4"
    >
      <div
        v-for="i in 4"
        :key="i"
        class="flex gap-3 mb-3 last:mb-0"
      >
        <div class="animate-pulse h-2.5 w-2.5 rounded-full bg-bg-primary mt-1" />
        <div class="flex-1 space-y-1.5">
          <div class="h-3 w-48 rounded bg-bg-primary" />
          <div class="h-3 w-24 rounded bg-bg-primary" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="plans.length === 0"
      class="rounded-base border border-border-default bg-bg-card p-6 text-center"
    >
      <p class="text-sm text-text-muted">
        No timeline entries to display.
      </p>
    </div>

    <!-- Timeline per plan -->
    <div
      v-else
      class="space-y-3"
    >
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="rounded-base border border-border-default bg-bg-card p-4"
      >
        <!-- Plan heading -->
        <div class="mb-3">
          <h3 class="text-sm font-medium text-text-primary">
            {{ plan.note ?? `Plan ${plan.id.slice(0, 8)}` }}
          </h3>
          <p class="mt-1 text-xs text-text-muted">
            Account: {{ accountLabels[plan.id] ?? 'Missing account' }}
          </p>
        </div>

        <!-- Vertical timeline -->
        <div class="relative pl-5">
          <!-- Connecting line -->
          <div class="absolute left-[4px] top-1.5 bottom-1.5 w-px bg-border-default" />

          <div
            v-for="obligation in sortedObligations(plan)"
            :key="obligation.id"
            class="relative pb-2.5 last:pb-0"
          >
            <!-- Dot -->
            <span
              :class="[
                dotClass(entryStatus(obligation)),
                'absolute -left-5 top-1 h-2.5 w-2.5 rounded-full',
              ]"
            />

            <!-- Entry content -->
            <div
              :class="[
                isMuted(entryStatus(obligation)) ? 'opacity-40' : '',
              ]"
              class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
            >
              <!-- Date + installment number + amount -->
              <span class="min-w-[70px] text-xs text-text-muted">
                {{ formatDate(obligation.dueDate) }}
              </span>

              <span class="text-sm text-text-primary">
                #{{ obligation.installmentNumber }}
              </span>

              <span class="font-mono text-sm text-text-primary">
                {{ formatCurrency(obligation.amount, plan.currency) }}
              </span>

              <!-- Status badge -->
              <Badge
                :text="statusBadgeText(entryStatus(obligation))"
                :variant="statusBadgeVariant(entryStatus(obligation))"
              />

              <!-- Pay button for pending obligations -->
              <button
                v-if="obligation.status === 'PENDING'"
                type="button"
                class="rounded-base bg-accent-blue/15 px-2.5 py-1 text-[11px] font-medium text-accent-blue transition-colors hover:bg-accent-blue/25 sm:ml-auto"
                @click="emit('pay', obligation.id)"
              >
                Pay Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
