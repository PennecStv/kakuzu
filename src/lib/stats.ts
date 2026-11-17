import type { Category, Kind, Transaction } from '../store/types';
import { monthOf, shiftMonth, type DayKey, type MonthKey, type Period } from './dates';

export interface Totals {
  income: number;
  expense: number;
  balance: number;
}

export function inPeriod(transactions: Transaction[], period: Period): Transaction[] {
  return transactions.filter((t) => t.date.startsWith(period));
}

export function totals(transactions: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.kind === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export interface MonthTotals {
  month: MonthKey;
  income: number;
  expense: number;
}

/** Income and expense of the `count` months ending with `end`, oldest first. Empty months are zero. */
export function monthlyTotals(transactions: Transaction[], end: MonthKey, count: number): MonthTotals[] {
  const rows = Array.from({ length: count }, (_, i) => ({ month: shiftMonth(end, i - count + 1), income: 0, expense: 0 }));
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  for (const t of transactions) {
    const row = byMonth.get(monthOf(t.date));
    if (row) row[t.kind] += t.amount;
  }
  return rows;
}

/** Axis ticks from 0 to at least `max`, on a 1-2-2.5-5 step, `count` intervals at most. */
export function niceTicks(max: number, count = 3): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * magnitude).find((s) => s >= raw) ?? 10 * magnitude;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

export interface Slice {
  /** Category id, or null for the folded "Autres" slice. */
  id: string | null;
  amount: number;
  share: number;
}

/** Total per category id. */
export function sumByCategory(transactions: Transaction[]): Map<string, number> {
  const sums = new Map<string, number>();
  for (const t of transactions) sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.amount);
  return sums;
}

/** Total per category of one kind, largest first. */
export function byCategory(transactions: Transaction[], kind: Kind): Slice[] {
  const sums = sumByCategory(transactions.filter((t) => t.kind === kind));
  const total = [...sums.values()].reduce((a, b) => a + b, 0);
  return [...sums]
    .map(([id, amount]) => ({ id, amount, share: total ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

/** Stable key of a slice, "other" for the folded one. */
export const sliceKey = (s: Slice) => s.id ?? 'other';

/** Keeps the donut readable: past `max` slices the tail becomes one "Autres" slice. */
export function foldSlices(slices: Slice[], max = 6): Slice[] {
  if (slices.length <= max) return slices;
  const head = slices.slice(0, max - 1);
  const tail = slices.slice(max - 1);
  return [
    ...head,
    {
      id: null,
      amount: tail.reduce((a, s) => a + s.amount, 0),
      share: tail.reduce((a, s) => a + s.share, 0),
    },
  ];
}

export interface DayGroup {
  day: DayKey;
  transactions: Transaction[];
  balance: number;
}

/** Newest day first, newest entry first within a day. */
export function groupByDay(transactions: Transaction[]): DayGroup[] {
  const sorted = [...transactions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  );
  const groups: DayGroup[] = [];
  for (const t of sorted) {
    let group = groups.at(-1);
    if (group?.day !== t.date) {
      group = { day: t.date, transactions: [], balance: 0 };
      groups.push(group);
    }
    group.transactions.push(t);
    group.balance += t.kind === 'income' ? t.amount : -t.amount;
  }
  return groups;
}

export function matchesQuery(t: Transaction, category: Category | undefined, query: string): boolean {
  const q = query.trim().toLocaleLowerCase('fr');
  if (!q) return true;
  return (
    t.note.toLocaleLowerCase('fr').includes(q) ||
    (category?.name.toLocaleLowerCase('fr').includes(q) ?? false)
  );
}
