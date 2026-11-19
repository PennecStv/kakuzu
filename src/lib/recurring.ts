import type { Recurring, Transaction } from '../store/types';
import { type MonthKey, type Period, monthOf, shiftMonth, unitOf } from './dates';

export type NewEntry = Omit<Transaction, 'id' | 'createdAt'>;

function entryOf(r: Recurring, month: MonthKey): NewEntry {
  return { kind: r.kind, amount: r.amount, categoryId: r.categoryId, note: r.note, date: `${month}-01`, recurringId: r.id };
}

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
      entries.push(entryOf(r, month));
      month = shiftMonth(month, 1);
    }
    return month === r.next ? r : { ...r, next: month };
  });
  return { entries, recurring: moved };
}

/**
 * The entries the recurring ones will add in `period` and have not added yet: from its `next` month
 * on, a month gets them on its 1st. Lets a chart show a month to come as it will be.
 */
export function plannedEntries(recurring: Recurring[], period: Period): NewEntry[] {
  const months = unitOf(period) === 'year' ? Array.from({ length: 12 }, (_, i) => shiftMonth(`${period}-01`, i)) : [monthOf(period)];
  // A day period holds a month's 1st or nothing.
  return recurring.flatMap((r) => months.filter((m) => m >= r.next && `${m}-01`.startsWith(period)).map((m) => entryOf(r, m)));
}

/** The recurring entry an entry starts: the entry is its first month, the next one comes on the 1st of the month after. */
export function recurringAfter(entry: Pick<NewEntry, 'kind' | 'amount' | 'categoryId' | 'note' | 'date'>): Omit<Recurring, 'id'> {
  const { kind, amount, categoryId, note, date } = entry;
  return { kind, amount, categoryId, note, next: shiftMonth(monthOf(date), 1) };
}

/** Income first, then expenses, the largest first in each. */
export function sortRecurring(recurring: Recurring[]): Recurring[] {
  return [...recurring].sort((a, b) => (a.kind === b.kind ? b.amount - a.amount : a.kind === 'income' ? -1 : 1));
}
