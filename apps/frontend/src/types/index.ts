/** Data point for generic charts (line, bar). */
export interface ChartDataPoint {
  label: string;
  value: number;
}

/** Category split for donut charts. */
export interface CategorySplit {
  category: string;
  amount: number;
  color?: string;
}

/** Monthly aggregated data for trend charts. */
export interface MonthlyData {
  month: string; // e.g. "2026-01"
  income: number;
  expenses: number;
  balance: number;
}

/** Daily aggregated data for the current month chart. */
export interface DailyData {
  day: number; // 1-31
  date: string; // "YYYY-MM-DD"
  income: number;
  expenses: number;
  balance: number;
}

/** Single day entry for the spending heatmap calendar. */
export interface HeatmapDay {
  date: string; // ISO date string "YYYY-MM-DD"
  amount: number;
}

/** Transaction row for table display. */
export interface TransactionRow {
  id: string;
  description: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  type: string;
  installmentPlanId?: string | null;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
}

/** Financial goal with progress tracking. */
export interface GoalProgress {
  id: string;
  name: string;
  type: string;
  currentAmount: number;
  targetAmount: number;
  deadline?: string | null;
  monthlyContribution?: number | null;
}

/** Budget category with spent vs budgeted amounts. */
export interface BudgetCategory {
  categoryId: string;
  categoryName: string;
  budgeted: number;
  spent: number;
  currency: string;
}

/** Installment plan derived from grouped transactions. */
export interface InstallmentPlan {
  planId: string;
  description: string;
  totalAmount: number;
  currency: string;
  paidInstallments: number;
  totalInstallments: number;
  nextPaymentDate?: string | null;
  transactions: TransactionRow[];
}
