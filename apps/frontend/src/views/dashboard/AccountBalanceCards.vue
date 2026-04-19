<script setup lang="ts">
import type { AccountOwnership } from '@expenses/api';
import { computed } from 'vue';
import { formatCurrency, formatDate } from '@/utils/format';

interface AccountSummaryItem {
  accountId: string;
  name: string;
  currency: string;
  ownership: AccountOwnership;
  currentBalance: number;
  archivedAt: string | null;
  lastTransactionDate: string | null;
}

interface Props {
  summaries: AccountSummaryItem[];
  loading: boolean;
}

const props = defineProps<Props>();

const ownedSummaries = computed(() =>
  props.summaries.filter((summary) => summary.ownership !== 'third_party'),
);

const externalSummaries = computed(() =>
  props.summaries.filter((summary) => summary.ownership === 'third_party'),
);

function ownershipLabel(ownership: AccountOwnership): string {
  switch (ownership) {
    case 'self':
      return 'My account';
    case 'custodial':
      return 'Custodial';
    case 'third_party':
      return 'Third-party destination';
  }
}
</script>

<template>
  <section class="rounded-base border border-border-default bg-bg-card p-5">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-medium text-text-primary">Account balances</h3>
        <p class="text-xs text-text-muted">Server-derived balances keep transfer rows out of income and expense analytics.</p>
      </div>

      <RouterLink
        to="/accounts"
        class="inline-flex items-center gap-2 rounded-base border border-border-default px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
      >
        Manage banking
      </RouterLink>
    </div>

    <div v-if="loading" class="mt-4 text-sm text-text-muted">Loading balances...</div>

    <div v-else-if="summaries.length === 0" class="mt-4 rounded-base border border-dashed border-border-default p-4 text-sm text-text-muted">
      No account balances available yet.
    </div>

    <div v-else class="mt-4 space-y-4">
      <section v-if="ownedSummaries.length > 0" class="space-y-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-text-muted">Your money</p>
          <p class="mt-1 text-xs text-text-muted">Owned and custodial balances stay visible here. Third-party destinations stay separate.</p>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="summary in ownedSummaries"
            :key="summary.accountId"
            class="rounded-base border p-4"
            :class="summary.archivedAt ? 'border-border-default/50 bg-bg-primary/40 opacity-80' : 'border-border-default bg-bg-primary/70'"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <h4 class="text-sm font-medium text-text-primary">{{ summary.name }}</h4>
                <p class="mt-1 text-xs text-text-muted">{{ summary.currency }}</p>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span class="rounded-full bg-bg-card px-2 py-1 text-[11px] text-text-muted">{{ ownershipLabel(summary.ownership) }}</span>
                <span v-if="summary.archivedAt" class="rounded-full bg-bg-card px-2 py-1 text-[11px] text-text-muted">Archived</span>
              </div>
            </div>

            <p class="mt-4 font-mono text-lg text-text-primary">
              {{ formatCurrency(summary.currentBalance, summary.currency) }}
            </p>

            <p class="mt-1 text-xs text-text-muted">
              {{ summary.lastTransactionDate ? `Last activity ${formatDate(summary.lastTransactionDate)}` : 'No linked activity yet' }}
            </p>
          </article>
        </div>
      </section>

      <section v-if="externalSummaries.length > 0" class="space-y-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-wide text-text-muted">Tracked destinations</p>
          <p class="mt-1 text-xs text-text-muted">These balances represent payees or recipients and stay outside your money totals.</p>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="summary in externalSummaries"
            :key="summary.accountId"
            class="rounded-base border border-border-default/50 bg-bg-primary/40 p-4 opacity-80"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <h4 class="text-sm font-medium text-text-primary">{{ summary.name }}</h4>
                <p class="mt-1 text-xs text-text-muted">{{ summary.currency }}</p>
              </div>
              <div class="flex flex-col items-end gap-1">
                <span class="rounded-full bg-bg-card px-2 py-1 text-[11px] text-text-muted">{{ ownershipLabel(summary.ownership) }}</span>
                <span v-if="summary.archivedAt" class="rounded-full bg-bg-card px-2 py-1 text-[11px] text-text-muted">Archived</span>
              </div>
            </div>

            <p class="mt-4 font-mono text-lg text-text-primary">
              {{ formatCurrency(summary.currentBalance, summary.currency) }}
            </p>

            <p class="mt-1 text-xs text-text-muted">
              {{ summary.lastTransactionDate ? `Last activity ${formatDate(summary.lastTransactionDate)}` : 'No linked activity yet' }}
            </p>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
