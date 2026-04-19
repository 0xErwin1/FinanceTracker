export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export function summarizeCurrencyMap(amounts: Record<string, number>): {
  entries: CurrencyAmount[];
  hasMultipleCurrencies: boolean;
} {
  const entries = Object.entries(amounts)
    .filter(([, amount]) => amount !== 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => ({ currency, amount }));

  return {
    entries,
    hasMultipleCurrencies: entries.length > 1,
  };
}

function addCurrencyAmount(target: Record<string, number>, currency: string, amount: number): void {
  target[currency] = (target[currency] ?? 0) + amount;
}

export function buildBudgetTotalsByCurrency(
  items: Array<{ currency: string; budgeted: number; spent: number }>,
): {
  budgeted: CurrencyAmount[];
  spent: CurrencyAmount[];
  hasMultipleCurrencies: boolean;
} {
  const budgetedByCurrency: Record<string, number> = {};
  const spentByCurrency: Record<string, number> = {};

  for (const item of items) {
    addCurrencyAmount(budgetedByCurrency, item.currency, item.budgeted);
    addCurrencyAmount(spentByCurrency, item.currency, item.spent);
  }

  const budgeted = summarizeCurrencyMap(budgetedByCurrency);
  const spent = summarizeCurrencyMap(spentByCurrency);

  return {
    budgeted: budgeted.entries,
    spent: spent.entries,
    hasMultipleCurrencies: budgeted.hasMultipleCurrencies || spent.hasMultipleCurrencies,
  };
}

export function buildTransactionGroupSummary(
  transactions: Array<{ type: string; amount: number; currency: string }>,
): {
  combinedTotal: CurrencyAmount | null;
  currencyTotals: CurrencyAmount[];
  hasMultipleCurrencies: boolean;
} {
  const totalsByCurrency: Record<string, number> = {};

  for (const transaction of transactions) {
    const signedAmount = transaction.type === 'INCOME' ? transaction.amount : -transaction.amount;
    addCurrencyAmount(totalsByCurrency, transaction.currency, signedAmount);
  }

  const summary = summarizeCurrencyMap(totalsByCurrency);

  return {
    combinedTotal: summary.hasMultipleCurrencies || summary.entries.length === 0 ? null : summary.entries[0],
    currencyTotals: summary.entries,
    hasMultipleCurrencies: summary.hasMultipleCurrencies,
  };
}
