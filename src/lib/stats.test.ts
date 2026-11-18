import { describe, expect, it } from 'vitest';
import type { Transaction } from '../store/types';
import { toCsv } from './csv';
import {
  balanceBefore,
  byCategory,
  foldSlices,
  groupByDay,
  inPeriod,
  matchesQuery,
  monthlyTotals,
  niceTicks,
  sumByCategory,
  totals,
} from './stats';

let seq = 0;
function tx(partial: Partial<Transaction>): Transaction {
  seq += 1;
  return {
    id: `t${seq}`,
    kind: 'expense',
    amount: 1000,
    categoryId: 'food',
    date: '2026-11-10',
    note: '',
    createdAt: seq,
    ...partial,
  };
}

describe('totals', () => {
  it('splits income and expenses', () => {
    const list = [tx({ amount: 2500 }), tx({ kind: 'income', amount: 10000 }), tx({ amount: 500 })];
    expect(totals(list)).toEqual({ income: 10000, expense: 3000, balance: 7000 });
  });

  it('filters a month', () => {
    const list = [tx({ date: '2026-10-31' }), tx({ date: '2026-11-01' })];
    expect(inPeriod(list, '2026-11')).toHaveLength(1);
    expect(inPeriod(list, '2026')).toHaveLength(2);
    expect(inPeriod(list, '2026-10-31')).toHaveLength(1);
  });
});

describe('byCategory', () => {
  const list = [
    tx({ categoryId: 'food', amount: 300 }),
    tx({ categoryId: 'home', amount: 600 }),
    tx({ categoryId: 'food', amount: 100 }),
    tx({ kind: 'income', categoryId: 'salary', amount: 9999 }),
  ];

  it('sums per category, largest first, keeping one kind', () => {
    const slices = byCategory(list, 'expense');
    expect(slices.map((s) => [s.id, s.amount])).toEqual([
      ['home', 600],
      ['food', 400],
    ]);
    expect(slices[0]?.share).toBeCloseTo(0.6);
    expect(byCategory(list, 'income')).toEqual([{ id: 'salary', amount: 9999, share: 1 }]);
  });

  it('returns nothing without expenses', () => {
    expect(byCategory([], 'expense')).toEqual([]);
  });
});

describe('sumByCategory', () => {
  it('adds up every entry of a category', () => {
    const sums = sumByCategory([tx({ categoryId: 'a', amount: 1 }), tx({ categoryId: 'a', amount: 2 }), tx({ categoryId: 'b', amount: 5 })]);
    expect(Object.fromEntries(sums)).toEqual({ a: 3, b: 5 });
  });
});

describe('foldSlices', () => {
  const slices = [50, 20, 10, 8, 5, 4, 3].map((amount, i) => ({ id: `c${i}`, amount, share: amount / 100 }));

  it('keeps short lists untouched', () => {
    expect(foldSlices(slices.slice(0, 6))).toHaveLength(6);
  });

  it('folds the tail into one slice', () => {
    const folded = foldSlices(slices);
    expect(folded).toHaveLength(6);
    expect(folded.at(-1)).toEqual({ id: null, amount: 7, share: 0.07 });
  });
});

describe('groupByDay', () => {
  it('orders days and entries newest first with a daily balance', () => {
    const a = tx({ date: '2026-11-02', amount: 100 });
    const b = tx({ date: '2026-11-05', kind: 'income', amount: 1000 });
    const c = tx({ date: '2026-11-05', amount: 300 });
    const groups = groupByDay([a, b, c]);
    expect(groups.map((g) => g.day)).toEqual(['2026-11-05', '2026-11-02']);
    expect(groups[0]?.transactions.map((t) => t.id)).toEqual([c.id, b.id]);
    expect(groups[0]?.balance).toBe(700);
  });
});

describe('matchesQuery', () => {
  const category = { id: 'food', kind: 'expense' as const, name: 'Alimentation', icon: 'basket' as const, color: 1 };

  it('searches the note and the category name, case-insensitive', () => {
    expect(matchesQuery(tx({ note: 'Boulangerie' }), category, 'boul')).toBe(true);
    expect(matchesQuery(tx({}), category, 'ALIM')).toBe(true);
    expect(matchesQuery(tx({}), category, 'loyer')).toBe(false);
    expect(matchesQuery(tx({}), category, '  ')).toBe(true);
  });
});

describe('toCsv', () => {
  it('writes French-friendly rows and escapes separators', () => {
    const csv = toCsv(
      [tx({ amount: 1250, note: 'Pain; beurre', date: '2026-11-03' })],
      [{ id: 'food', kind: 'expense', name: 'Alimentation', icon: 'basket' as const, color: 1 }],
      'EUR',
    );
    expect(csv.split('\n')).toEqual([
      'Date;Type;Catégorie;Montant;Note',
      '2026-11-03;Dépense;Alimentation;-12,50;"Pain; beurre"',
    ]);
  });
});

describe('monthlyTotals', () => {
  it('sums each month of the window, oldest first, across a year change', () => {
    const list = [
      tx({ date: '2025-12-31', amount: 300 }),
      tx({ date: '2026-02-01', kind: 'income', amount: 9000 }),
      tx({ date: '2026-02-14', amount: 1200 }),
      tx({ date: '2026-03-01', amount: 999 }),
      tx({ date: '2025-10-01', amount: 50 }),
    ];
    expect(monthlyTotals(list, '2026-02', 3)).toEqual([
      { month: '2025-12', income: 0, expense: 300 },
      { month: '2026-01', income: 0, expense: 0 },
      { month: '2026-02', income: 9000, expense: 1200 },
    ]);
  });
});

describe('niceTicks', () => {
  it('reaches the max on a round step', () => {
    expect(niceTicks(134000)).toEqual([0, 50000, 100000, 150000]);
    expect(niceTicks(300)).toEqual([0, 100, 200, 300]);
    expect(niceTicks(70000)).toEqual([0, 25000, 50000, 75000]);
  });

  it('has a single tick for an empty chart', () => {
    expect(niceTicks(0)).toEqual([0]);
  });
});

describe('balanceBefore', () => {
  const entries = [
    tx({ kind: 'income', amount: 200000, date: '2025-12-31' }),
    tx({ amount: 150000, date: '2026-10-05' }),
    tx({ amount: 5000, date: '2026-10-31' }),
    tx({ kind: 'income', amount: 9900, date: '2026-11-01' }),
    tx({ amount: 1000, date: '2026-11-18' }),
  ];

  it('sums what came before a month, a day or a year', () => {
    expect(balanceBefore(entries, '2026-11')).toBe(45000);
    expect(balanceBefore(entries, '2026-11-18')).toBe(54900);
    expect(balanceBefore(entries, '2026')).toBe(200000);
  });

  it('carries a deficit too', () => {
    expect(balanceBefore([tx({ amount: 3000, date: '2026-10-02' })], '2026-11')).toBe(-3000);
  });

  it('is zero with nothing before', () => {
    expect(balanceBefore(entries, '2025')).toBe(0);
  });
});
