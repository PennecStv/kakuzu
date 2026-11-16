import { describe, expect, it } from 'vitest';
import type { Transaction } from '../store/types';
import { toCsv } from './csv';
import { expensesByCategory, foldSlices, groupByDay, inMonth, matchesQuery, totals } from './stats';

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
    expect(inMonth(list, '2026-11')).toHaveLength(1);
  });
});

describe('expensesByCategory', () => {
  it('sums per category, largest first, ignoring income', () => {
    const slices = expensesByCategory([
      tx({ categoryId: 'food', amount: 300 }),
      tx({ categoryId: 'home', amount: 600 }),
      tx({ categoryId: 'food', amount: 100 }),
      tx({ kind: 'income', categoryId: 'salary', amount: 9999 }),
    ]);
    expect(slices.map((s) => [s.id, s.amount])).toEqual([
      ['home', 600],
      ['food', 400],
    ]);
    expect(slices[0]?.share).toBeCloseTo(0.6);
  });

  it('returns nothing without expenses', () => {
    expect(expensesByCategory([])).toEqual([]);
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
  const category = { id: 'food', kind: 'expense' as const, name: 'Alimentation', glyph: '食', color: 1 };

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
      [{ id: 'food', kind: 'expense', name: 'Alimentation', glyph: '食', color: 1 }],
      'EUR',
    );
    expect(csv.split('\n')).toEqual([
      'Date;Type;Catégorie;Montant;Note',
      '2026-11-03;Dépense;Alimentation;-12,50;"Pain; beurre"',
    ]);
  });
});
