import { CurrencyEnum, type TransactionDTO, TransactionType } from '@expenses/api';
import { transactionService } from '../../src/services/transactions.service';

function makeTransaction(overrides: Partial<TransactionDTO> = {}): TransactionDTO {
  return {
    id: overrides.id ?? 'tx-1',
    type: overrides.type ?? TransactionType.EXPENSE,
    amount: overrides.amount ?? 100,
    currency: overrides.currency ?? CurrencyEnum.USD,
    note: overrides.note ?? '',
    date: overrides.date ?? '2026-04-19',
    exchangeRate: overrides.exchangeRate ?? 1,
    userId: overrides.userId ?? 'user-1',
    categoryId: overrides.categoryId ?? 'category-1',
    accountId: overrides.accountId ?? 'account-1',
    goalId: overrides.goalId ?? null,
    recurringTransactionId: overrides.recurringTransactionId ?? null,
    obligationId: overrides.obligationId ?? null,
    transferGroupId: overrides.transferGroupId ?? null,
    transferDirection: overrides.transferDirection ?? null,
    counterpartyAccountId: overrides.counterpartyAccountId ?? null,
    deletedAt: overrides.deletedAt ?? null,
    category: overrides.category,
    financialGoal: overrides.financialGoal,
  };
}

describe('transactionService.calculateBalances', () => {
  it('keeps a same-currency total for legacy single-currency consumers', () => {
    const result = transactionService.calculateBalances([
      makeTransaction({ type: TransactionType.EXPENSE, amount: 100, currency: CurrencyEnum.USD }),
      makeTransaction({ id: 'tx-2', type: TransactionType.EXPENSE, amount: 25, currency: CurrencyEnum.USD }),
    ]);

    expect(result.expenses).toEqual({
      total: 125,
      eur: 0,
      usd: 125,
      uyu: 0,
    });
  });

  it('drops the implicit mixed-currency total while preserving native currency buckets', () => {
    const result = transactionService.calculateBalances([
      makeTransaction({ type: TransactionType.EXPENSE, amount: 100, currency: CurrencyEnum.USD }),
      makeTransaction({ id: 'tx-2', type: TransactionType.EXPENSE, amount: 50, currency: CurrencyEnum.EUR }),
    ]);

    expect(result.expenses).toEqual({
      total: 0,
      eur: 50,
      usd: 100,
      uyu: 0,
    });
  });
});
