/**
 * Amounts are stored as integer hundredths whatever the currency, so sums stay
 * exact and switching the display currency never rescales stored values.
 */
export const SCALE = 100;

/** About ten billion: far above any budget, far below the float precision limit. */
export const MAX_AMOUNT = 1e12;

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string): Intl.NumberFormat {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', { style: 'currency', currency });
    formatters.set(currency, f);
  }
  return f;
}

/** Fraction digits a currency is written with: 2 for EUR, 0 for JPY. */
export function currencyDigits(currency: string): number {
  return formatter(currency).resolvedOptions().maximumFractionDigits ?? 2;
}

export function formatMoney(minor: number, currency: string): string {
  return formatter(currency).format(minor / SCALE);
}

const axisFull = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const axisCompact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

/** Chart tick without the currency: "1 000" below ten thousand, "25 k" above, "−500" below zero. */
export function formatAxis(minor: number): string {
  const value = Math.abs(minor) / SCALE;
  const text = (value >= 10_000 ? axisCompact : axisFull).format(value);
  return minor < 0 ? `−${text}` : text;
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
 * Returns hundredths, or null when the input is not a positive amount the
 * currency can be written with (no cents for JPY).
 */
export function parseAmount(input: string, currency: string): number | null {
  const cleaned = input.replace(/[\s\u00a0\u202f€$£¥]/g, '').replace(',', '.');
  const match = /^(\d*)(?:\.(\d*))?$/.exec(cleaned);
  if (!match || (match[1] === '' && !match[2])) return null;
  if ((match[2] ?? '').length > currencyDigits(currency)) return null;
  const minor = Math.round(Number(cleaned) * SCALE);
  return minor > 0 && minor <= MAX_AMOUNT ? minor : null;
}

/** Inverse of parseAmount, used to prefill the edit form. */
export function toInput(minor: number, currency: string): string {
  const value = minor / SCALE;
  return Number.isInteger(value) ? String(value) : value.toFixed(currencyDigits(currency)).replace('.', ',');
}
