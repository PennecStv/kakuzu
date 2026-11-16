const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string): Intl.NumberFormat {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', { style: 'currency', currency });
    formatters.set(currency, f);
  }
  return f;
}

/** Fraction digits of a currency: 2 for EUR, 0 for JPY. */
export function currencyDigits(currency: string): number {
  return formatter(currency).resolvedOptions().maximumFractionDigits ?? 2;
}

/** Amounts are stored as integer minor units (cents) to keep sums exact. */
export function formatMoney(minor: number, currency: string): string {
  return formatter(currency).format(minor / 10 ** currencyDigits(currency));
}

/** "€" for EUR, "$" for USD: what to print next to an amount field. */
export function currencySymbol(currency: string): string {
  const parts = new Intl.NumberFormat('fr-FR', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value ?? currency;
}

export function formatSigned(minor: number, currency: string): string {
  const text = formatMoney(Math.abs(minor), currency);
  if (minor > 0) return `+${text}`;
  if (minor < 0) return `−${text}`;
  return text;
}

/**
 * Parses what people type on a phone keypad: "12,5", "12.50", "1 234,56".
 * Returns minor units, or null when the input is not a positive amount.
 */
export function parseAmount(input: string, currency: string): number | null {
  const cleaned = input.replace(/[\s\u00a0\u202f€$£¥]/g, '').replace(',', '.');
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(cleaned)) return null;
  const digits = currencyDigits(currency);
  const minor = Math.round(Number(cleaned) * 10 ** digits);
  return minor > 0 ? minor : null;
}

/** Inverse of parseAmount, used to prefill the edit form. */
export function toInput(minor: number, currency: string): string {
  const digits = currencyDigits(currency);
  const value = minor / 10 ** digits;
  return Number.isInteger(value) ? String(value) : value.toFixed(digits).replace('.', ',');
}
