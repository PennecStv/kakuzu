import type { Category, Transaction } from '../store/types';
import { monthOf, type DayKey, type MonthKey } from './dates';

export interface Totals {
  income: number;
  expense: number;
  balance: number;
}

export function inMonth(transactions: Transaction[], month: MonthKey): Transaction[] {
  return transactions.filter((t) => monthOf(t.date) === month);
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

export interface Slice {
  /** Category id, or null for the folded "Autres" slice. */
  id: string | null;
  amount: number;
  share: number;
}

/** Expense total per category, largest first. */
export function expensesByCategory(transactions: Transaction[]): Slice[] {
  const sums = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind === 'expense') sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.amount);
  }
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
