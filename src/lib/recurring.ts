import type { Recurring, Transaction } from '../store/types';
import { type MonthKey, shiftMonth } from './dates';

export type NewEntry = Omit<Transaction, 'id' | 'createdAt'>;

/**
 * The entries of every month each recurring entry is due in, up to `now`, dated the 1st, and the
 * recurring entries moved on to the month after. A month missed while the app was closed is filled in.
 */
export function dueEntries(recurring: Recurring[], now: MonthKey): { entries: NewEntry[]; recurring: Recurring[] } {
  const entries: NewEntry[] = [];
  const moved = recurring.map((r) => {
    let month = r.next;
    // Month keys sort like the months they name.
    while (month <= now) {
      entries.push({ kind: r.kind, amount: r.amount, categoryId: r.categoryId, note: r.note, date: `${month}-01`, recurringId: r.id });
      month = shiftMonth(month, 1);
    }
    return month === r.next ? r : { ...r, next: month };
  });
  return { entries, recurring: moved };
}

/** Income first, then expenses, the largest first in each. */
export function sortRecurring(recurring: Recurring[]): Recurring[] {
  return [...recurring].sort((a, b) => (a.kind === b.kind ? b.amount - a.amount : a.kind === 'income' ? -1 : 1));
}
