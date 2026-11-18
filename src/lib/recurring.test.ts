import { describe, expect, it } from 'vitest';
import type { Recurring } from '../store/types';
import { dueEntries, sortRecurring } from './recurring';

const salary: Recurring = { id: 'r1', kind: 'income', amount: 50000, categoryId: 'salary', note: 'Salaire', next: '2026-11' };
const rent: Recurring = { id: 'r2', kind: 'expense', amount: 65000, categoryId: 'home', note: 'Loyer', next: '2026-12' };

describe('dueEntries', () => {
  it('adds an entry on the 1st of the month it is due in, then moves on', () => {
    const { entries, recurring } = dueEntries([salary, rent], '2026-11');
    expect(entries).toEqual([
      { kind: 'income', amount: 50000, categoryId: 'salary', note: 'Salaire', date: '2026-11-01', recurringId: 'r1' },
    ]);
    expect(recurring.map((r) => r.next)).toEqual(['2026-12', '2026-12']);
    expect(recurring[1]).toBe(rent);
  });

  it('fills in the months missed, across a new year', () => {
    const { entries, recurring } = dueEntries([rent], '2027-02');
    expect(entries.map((e) => e.date)).toEqual(['2026-12-01', '2027-01-01', '2027-02-01']);
    expect(recurring[0]?.next).toBe('2027-03');
  });

  it('adds nothing twice', () => {
    const first = dueEntries([salary], '2026-11');
    expect(dueEntries(first.recurring, '2026-11').entries).toEqual([]);
  });
});

describe('sortRecurring', () => {
  it('puts income first, the largest first', () => {
    const small = { ...rent, id: 'r3', amount: 1000 };
    const bonus = { ...salary, id: 'r4', amount: 90000 };
    expect(sortRecurring([small, salary, rent, bonus]).map((r) => r.id)).toEqual(['r4', 'r1', 'r2', 'r3']);
  });
});
