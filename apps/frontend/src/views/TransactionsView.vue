<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useRoute } from 'vue-router';
import { useTransactions } from '@/composables/useTransactions';
import { useCategories } from '@/composables/useCategories';
import { formatDate } from '@/utils/format';
import TransactionFilterBar from './transactions/TransactionFilterBar.vue';
import TransactionLedger from './transactions/TransactionLedger.vue';
import type { DayGroup, TransactionDisplay } from './transactions/TransactionLedger.vue';
import TelemetryFooter from './transactions/TelemetryFooter.vue';

const route = useRoute();
const router = useRouter();

// --- Filter state -----------------------------------------------------------

const typeFilter = ref('ALL');
const categoryFilter = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const searchFilter = ref((route.query.q as string) || '');

// --- Data sources -----------------------------------------------------------

const { transactions, loading, refetch } = useTransactions();
const { categories } = useCategories();

// --- Category lookup --------------------------------------------------------

const categoryMap = computed(() => {
  const items = categories.value;
  if (!Array.isArray(items)) {
    return new Map<string, { name: string; icon: string | null }>();
  }

  const map = new Map<string, { name: string; icon: string | null }>();
  for (const cat of items) {
    const c = cat as { id?: string; name?: string; icon?: string | null };
    if (c.id && c.name) {
      map.set(c.id, { name: c.name, icon: c.icon ?? null });
    }
  }
  return map;
});

const categoryOptions = computed(() => {
  const items = categories.value;
  if (!Array.isArray(items)) return [];

  return (items as Array<{ id: string; name: string }>).map((c) => ({
    id: c.id,
    name: c.name,
  }));
});

// --- Client-side filtering --------------------------------------------------

const filteredTransactions = computed(() => {
  const items = transactions.value;
  if (!Array.isArray(items)) return [];

  let result = items;

  if (typeFilter.value !== 'ALL') {
    result = result.filter((t) => (t as { type?: string }).type === typeFilter.value);
  }

  if (categoryFilter.value) {
    result = result.filter((t) => (t as { categoryId?: string }).categoryId === categoryFilter.value);
  }

  if (dateFrom.value) {
    result = result.filter((t) => {
      const d = (t as { date?: string }).date;
      return d != null && d >= dateFrom.value;
    });
  }

  if (dateTo.value) {
    result = result.filter((t) => {
      const d = (t as { date?: string }).date;
      return d != null && d <= `${dateTo.value}T23:59:59`;
    });
  }

  if (searchFilter.value) {
    const q = searchFilter.value.toLowerCase();
    result = result.filter((t) => {
      const tx = t as {
        note?: string | null;
        category?: { name?: string } | null;
      };
      const note = tx.note?.toLowerCase() ?? '';
      const catName = tx.category?.name?.toLowerCase() ?? '';
      return note.includes(q) || catName.includes(q);
    });
  }

  return result;
});

// --- Grouping by date -------------------------------------------------------

const groupedTransactions = computed<DayGroup[]>(() => {
  const groups = new Map<string, TransactionDisplay[]>();

  for (const t of filteredTransactions.value) {
    const tx = t as {
      id?: string;
      date?: string;
      categoryId?: string | null;
      category?: { name?: string; icon?: string | null } | null;
      note?: string | null;
      amount?: number;
      currency?: string;
      type?: string;
    };

    const dateKey = tx.date ? tx.date.split('T')[0] : 'unknown';
    const catData = tx.categoryId ? categoryMap.value.get(tx.categoryId) : null;

    const display: TransactionDisplay = {
      id: tx.id ?? '',
      date: tx.date ?? '',
      categoryName: tx.category?.name ?? catData?.name ?? 'Uncategorized',
      categoryIcon: tx.category?.icon ?? catData?.icon ?? null,
      note: tx.note ?? '',
      amount: Number(tx.amount ?? 0),
      currency: tx.currency ?? 'USD',
      type: tx.type ?? '',
    };

    let group = groups.get(dateKey);
    if (!group) {
      group = [];
      groups.set(dateKey, group);
    }
    group.push(display);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, txs]) => ({
      date,
      displayDate: formatDate(date),
      total: txs.reduce((sum, t) => sum + (t.type === 'INCOME' ? t.amount : -t.amount), 0),
      transactions: txs.sort((a, b) => b.date.localeCompare(a.date)),
    }));
});

// --- Telemetry --------------------------------------------------------------

const recordCount = computed(() => filteredTransactions.value.length);

const lastSync = computed(() => {
  if (loading.value) return 'Loading...';

  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
});
</script>

<template>
  <div class="flex h-full flex-col gap-3">
    <!-- Section 1: Filter Bar -->
    <TransactionFilterBar
      :type-filter="typeFilter"
      :category-filter="categoryFilter"
      :date-from="dateFrom"
      :date-to="dateTo"
      :categories="categoryOptions"
      @update:type-filter="typeFilter = $event"
      @update:category-filter="categoryFilter = $event"
      @update:date-from="dateFrom = $event"
      @update:date-to="dateTo = $event"
      @export="() => {}"
      @add-transaction="router.push('/transactions/create')"
    />

    <!-- Section 2: Transaction Ledger -->
    <div class="flex-1 overflow-y-auto">
      <TransactionLedger
        :groups="groupedTransactions"
        :loading="loading"
        @refresh="refetch"
      />
    </div>

    <!-- Section 3: Telemetry Footer -->
    <TelemetryFooter :record-count="recordCount" :last-sync="lastSync" />
  </div>
</template>
