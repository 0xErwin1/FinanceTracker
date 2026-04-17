/**
 * Format a numeric amount as currency string.
 *
 * @param amount - The numeric amount to format.
 * @param currency - ISO 4217 currency code (e.g. "USD", "UYU", "EUR").
 * @returns Formatted currency string (e.g. "$1,234.56").
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  const symbol = getCurrencySymbol(currency);

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol}${formatted}`;
}

/**
 * Format a number as a percentage string.
 *
 * @param value - The numeric value (e.g. 12.5 for 12.5%).
 * @returns Formatted percentage string (e.g. "12.5%").
 */
export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * Format a date string for display.
 *
 * @param date - ISO date string or Date object.
 * @returns Human-readable date string (e.g. "Apr 15, 2026").
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get the currency symbol for a given ISO currency code.
 *
 * @param currency - ISO 4217 currency code.
 * @returns Currency symbol string.
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '\u20AC',
    UYU: '$U',
    GBP: '\u00A3',
    BRL: 'R$',
    ARS: '$',
  };

  return symbols[currency] ?? `${currency} `;
}
