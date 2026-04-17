import { computed, type ComputedRef, type Ref } from 'vue';
import type { trpc } from '@/api/trpc';
import type { ChartDataPoint, CategorySplit, HeatmapDay, MonthlyData, DailyData } from '@/types';
import { groupBy } from '@/utils/groupBy';

type TransactionItem = Awaited<ReturnType<typeof trpc.transaction.getAll.query>>[number];

interface AggregationResult {
  /** Monthly velocity: total expenses per month (last 6 months). */
  monthlyVelocity: ComputedRef<ChartDataPoint[]>;
  /** Monthly income, expenses, and running balance (last 6 months). */
  monthlyIncomeExpenses: ComputedRef<MonthlyData[]>;
  /** Daily income, expenses, and running balance for the current month. */
  currentMonthDaily: ComputedRef<DailyData[]>;
  /** Net savings: total income minus total expenses. */
  netSavings: ComputedRef<number>;
  /** Spending breakdown by category. */
  spendingByCategory: ComputedRef<CategorySplit[]>;
  /** Total income for the period. */
  totalIncome: ComputedRef<number>;
  /** Total expenses for the period. */
  totalExpenses: ComputedRef<number>;
  /** Heatmap data: spending per day. */
  heatmapData: ComputedRef<HeatmapDay[]>;
  /** Net savings broken down by currency code. */
  netSavingsByCurrency: ComputedRef<Record<string, number>>;
}

/**
 * Returns true for transactions that behave as expenses in dashboard
 * aggregations: EXPENSE type, and paid INSTALLMENTS (date <= today).
 * Future-dated installments are excluded since they are not yet realized.
 */
function isExpenseLike(t: TransactionItem): boolean {
  if (t.type === 'EXPENSE') return true;
  if (t.type === 'INSTALLMENTS') {
    const today = new Date().toISOString().split('T')[0];
    const d = (t.date as string)?.split('T')[0] ?? '';
    return d <= today;
  }
  return false;
}

/**
 * Returns true for transactions that count as income.
 * Currently only INCOME type. SAVING is a transfer, not income.
 */
function isIncomeLike(t: TransactionItem): boolean {
  return t.type === 'INCOME';
}

/**
 * Pure computation composable that derives dashboard metrics
 * from an array of transactions. No API calls -- takes a Ref
 * of transactions as input.
 */
export function useAggregations(transactions: Ref<TransactionItem[]>): AggregationResult {
  const totalIncome = computed(() =>
    transactions.value.filter(isIncomeLike).reduce((sum, t) => sum + Number(t.amount), 0),
  );

  const totalExpenses = computed(() =>
    transactions.value.filter(isExpenseLike).reduce((sum, t) => sum + Number(t.amount), 0),
  );

  const netSavings = computed(() => totalIncome.value - totalExpenses.value);

  const monthlyVelocity = computed<ChartDataPoint[]>(() => {
    const expenses = transactions.value.filter(isExpenseLike);
    const grouped = groupBy(expenses, (t) => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const sorted = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);

    return sorted.map(([month, txs]) => ({
      label: month,
      value: txs.reduce((sum, t) => sum + Number(t.amount), 0),
    }));
  });

  /** Monthly income, expenses, and cumulative running balance (last 6 months). */
  const monthlyIncomeExpenses = computed<MonthlyData[]>(() => {
    const monthKey = (t: { date: string }) => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const incomesByMonth = groupBy(transactions.value.filter(isIncomeLike), monthKey);
    const expensesByMonth = groupBy(transactions.value.filter(isExpenseLike), monthKey);

    const allMonths = new Set([...Object.keys(incomesByMonth), ...Object.keys(expensesByMonth)]);

    const sorted = [...allMonths].sort().slice(-6);

    let runningBalance = 0;
    return sorted.map((month) => {
      const income = (incomesByMonth[month] ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = (expensesByMonth[month] ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
      runningBalance += income - expenses;

      return { month, income, expenses, balance: runningBalance };
    });
  });

  /** Daily income, expenses, and running balance for the current month. */
  const currentMonthDaily = computed<DailyData[]>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    const currentMonthTx = transactions.value.filter((t) => (t.date as string).startsWith(monthPrefix));

    const incomesByDay = groupBy(currentMonthTx.filter(isIncomeLike), (t) =>
      String(new Date(t.date).getDate()),
    );
    const expensesByDay = groupBy(currentMonthTx.filter(isExpenseLike), (t) =>
      String(new Date(t.date).getDate()),
    );

    let runningBalance = 0;
    const result: DailyData[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d);
      const dateStr = `${monthPrefix}-${dayStr.padStart(2, '0')}`;

      const income = (incomesByDay[dayStr] ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = (expensesByDay[dayStr] ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

      // Only accumulate balance up to today; future days carry the last known balance
      if (d <= today) {
        runningBalance += income - expenses;
      }

      result.push({
        day: d,
        date: dateStr,
        income,
        expenses,
        balance: runningBalance,
      });
    }

    return result;
  });

  const spendingByCategory = computed<CategorySplit[]>(() => {
    const expenses = transactions.value.filter(isExpenseLike);
    const grouped = groupBy(
      expenses,
      (t) => (t.category as { name: string } | null)?.name ?? 'Uncategorized',
    );

    const palette = ['#e8c468', '#564338', '#8b6914', '#d4a843', '#3d2e1f', '#4ade80', '#60a5fa', '#f87171'];
    const entries = Object.entries(grouped).map(([cat, txs]) => ({
      category: cat,
      amount: txs.reduce((sum, t) => sum + Number(t.amount), 0),
    }));

    return entries
      .sort((a, b) => b.amount - a.amount)
      .map((entry, i) => ({
        ...entry,
        color: palette[i % palette.length],
      }));
  });

  const heatmapData = computed<HeatmapDay[]>(() => {
    const expenses = transactions.value.filter(isExpenseLike);
    const grouped = groupBy(expenses, (t) => {
      const d = new Date(t.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    return Object.entries(grouped).map(([date, txs]) => ({
      date,
      amount: txs.reduce((sum, t) => sum + Number(t.amount), 0),
    }));
  });

  const netSavingsByCurrency = computed<Record<string, number>>(() => {
    const result: Record<string, number> = {};

    for (const t of transactions.value) {
      const code = t.currency ?? 'USD';
      const amount = Number(t.amount);

      if (isIncomeLike(t)) {
        result[code] = (result[code] ?? 0) + amount;
      } else if (isExpenseLike(t)) {
        result[code] = (result[code] ?? 0) - amount;
      }
      // SAVING and future INSTALLMENTS are neutral for currency totals
    }

    return result;
  });

  return {
    monthlyVelocity,
    monthlyIncomeExpenses,
    currentMonthDaily,
    netSavings,
    spendingByCategory,
    totalIncome,
    totalExpenses,
    heatmapData,
    netSavingsByCurrency,
  };
}
