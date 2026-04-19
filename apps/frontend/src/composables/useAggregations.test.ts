import { CurrencyEnum, TransactionType } from '@expenses/api';
import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import type { trpc } from '@/api/trpc';
import { useAggregations } from './useAggregations';

type TransactionItem = Awaited<ReturnType<typeof trpc.transaction.getAll.query>>[number];

function makeTransaction(overrides: Record<string, unknown> = {}): TransactionItem {
  return {
    id: overrides.id ?? 'tx-1',
    userId: overrides.userId ?? 'user-1',
    amount: overrides.amount ?? 100,
    currency: overrides.currency ?? CurrencyEnum.USD,
    type: overrides.type ?? TransactionType.EXPENSE,
    date: overrides.date ?? '2026-04-18',
    note: overrides.note ?? '',
    categoryId: overrides.categoryId ?? null,
    category: overrides.category,
    goalId: overrides.goalId ?? null,
    recurringTransactionId: overrides.recurringTransactionId ?? null,
    obligationId: overrides.obligationId ?? null,
    accountId: overrides.accountId ?? 'account-1',
    account: overrides.account,
    counterpartyAccountId: overrides.counterpartyAccountId ?? null,
    counterpartyAccount: overrides.counterpartyAccount,
    transferGroupId: overrides.transferGroupId ?? null,
    transferDirection: overrides.transferDirection ?? null,
    exchangeRate: overrides.exchangeRate ?? null,
  } as TransactionItem;
}

describe('useAggregations', () => {
  it('returns native income, expense, and savings totals by currency with no valuation snapshot by default', () => {
    const transactions = ref([
      makeTransaction({ id: 'income-usd', type: 'INCOME', amount: 250, currency: 'USD' }),
      makeTransaction({ id: 'expense-usd', type: 'EXPENSE', amount: 100, currency: 'USD' }),
      makeTransaction({ id: 'income-eur', type: 'INCOME', amount: 90, currency: 'EUR' }),
      makeTransaction({ id: 'expense-eur', type: 'EXPENSE', amount: 25, currency: 'EUR' }),
      makeTransaction({
        id: 'transfer-out',
        type: 'EXPENSE',
        amount: 999,
        currency: 'USD',
        transferGroupId: 'group-1',
      }),
    ]);

    const aggregations = useAggregations(transactions);

    expect(aggregations.totalIncomeByCurrency.value).toEqual({
      EUR: 90,
      USD: 250,
    });
    expect(aggregations.totalExpensesByCurrency.value).toEqual({
      EUR: 25,
      USD: 100,
    });
    expect(aggregations.netSavingsByCurrency.value).toEqual({
      EUR: 65,
      USD: 150,
    });
    expect(aggregations.valuationSnapshot.value).toBeNull();
  });

  it('keeps a single-currency breakdown explicit instead of falling back to a synthetic grand total', () => {
    const transactions = ref([
      makeTransaction({ id: 'income-uyu', type: 'INCOME', amount: 1200, currency: 'UYU' }),
      makeTransaction({ id: 'expense-uyu', type: 'EXPENSE', amount: 350, currency: 'UYU' }),
    ]);

    const aggregations = useAggregations(transactions);

    expect(aggregations.totalIncomeByCurrency.value).toEqual({ UYU: 1200 });
    expect(aggregations.totalExpensesByCurrency.value).toEqual({ UYU: 350 });
    expect(aggregations.netSavingsByCurrency.value).toEqual({ UYU: 850 });
  });
});
