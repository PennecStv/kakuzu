import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from './defaults';
import { readAmount, readDate, readSheets } from './sheet';

describe('readDate', () => {
  it('reads ISO, French and Excel dates', () => {
    expect(readDate('2026-11-14')).toBe('2026-11-14');
    expect(readDate('14/11/2026 12:30')).toBe('2026-11-14');
    expect(readDate('4.3.26')).toBe('2026-03-04');
    expect(readDate('46340.0')).toBe('2026-11-14');
    expect(readDate('45351.75')).toBe('2024-02-29');
  });

  it('refuses days that do not exist', () => {
    expect(readDate('31/02/2026')).toBeNull();
    expect(readDate('hier')).toBeNull();
    expect(readDate('')).toBeNull();
  });
});

describe('readAmount', () => {
  it('reads both decimal marks and drops sign, spaces and symbols', () => {
    expect(readAmount('23,40')).toBe(2340);
    expect(readAmount('239.49')).toBe(23949);
    expect(readAmount('-1 234,56 €')).toBe(123456);
    expect(readAmount('1.234,5')).toBe(123450);
    expect(readAmount('0.30000000000000004')).toBe(30);
  });

  it('refuses zero and text', () => {
    expect(readAmount('0')).toBeNull();
    expect(readAmount('abc')).toBeNull();
  });
});

describe('readSheets', () => {
  const header = ['Date', 'Type', 'Catégorie', 'Montant', 'Note'];

  it('reads its own CSV export and matches categories by name', () => {
    const { transactions, categories, skipped } = readSheets(
      [{ name: '', rows: [header, ['2026-11-03', 'Dépense', 'alimentation', '-12,50', 'Pain'], ['2026-11-01', 'Revenu', 'Salaire', '2000', '']] }],
      DEFAULT_CATEGORIES,
    );
    expect(categories).toEqual([]);
    expect(skipped).toBe(0);
    expect(transactions.map((t) => [t.kind, t.categoryId, t.amount, t.date, t.note])).toEqual([
      ['expense', 'food', 1250, '2026-11-03', 'Pain'],
      ['income', 'salary', 200000, '2026-11-01', ''],
    ]);
  });

  it('finds the header below a title and takes the kind from the sheet name', () => {
    const rows = [['Liste dépenses 2026'], ['Date et heure', 'Catégorie', 'Montant dans la devise', 'Commentaire'], ['46340', 'Kebab', '9.5', 'Midi']];
    const { transactions, categories } = readSheets([{ name: 'Dépenses', rows }], DEFAULT_CATEGORIES);
    expect(transactions[0]).toMatchObject({ kind: 'expense', amount: 950, date: '2026-11-14', note: 'Midi' });
    expect(categories).toEqual([expect.objectContaining({ kind: 'expense', name: 'Kebab', id: transactions[0]?.categoryId })]);
  });

  it('creates a missing category once and files blank ones under Autres', () => {
    const rows = [header, ['2026-11-01', 'Dépense', 'Vélo', '10', ''], ['2026-11-02', 'dépenses', 'vélo', '5', ''], ['2026-11-03', 'Dépense', '', '1', '']];
    const { transactions, categories } = readSheets([{ name: '', rows }], DEFAULT_CATEGORIES);
    expect(categories).toHaveLength(1);
    expect(transactions.map((t) => t.categoryId)).toEqual([categories[0]?.id, categories[0]?.id, 'other-expense']);
  });

  it('counts the rows it cannot read and skips blank ones', () => {
    const rows = [header, ['2026-11-01', 'Dépense', '', '10', ''], ['', '', '', '', ''], ['2026-11-01', '', '', '10', ''], ['demain', 'Dépense', '', '10', '']];
    expect(readSheets([{ name: 'Feuille 1', rows }], DEFAULT_CATEGORIES).skipped).toBe(2);
  });

  it('explains what is missing', () => {
    expect(() => readSheets([{ name: '', rows: [['Jour', 'Prix']] }], DEFAULT_CATEGORIES)).toThrow(/Date et Montant/);
    expect(() => readSheets([{ name: '', rows: [header, ['x', 'Dépense', '', '1', '']] }], DEFAULT_CATEGORIES)).toThrow(/Aucune ligne/);
  });
});
