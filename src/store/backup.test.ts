import { describe, expect, it } from 'vitest';
import { readBackup } from './backup';
import type { Settings } from './types';

const fallback: Settings = { theme: 'koi', currency: 'EUR', motion: true };

const valid = {
  app: 'kakuzu',
  version: 2,
  categories: [{ id: 'food', kind: 'expense', name: 'Alimentation', icon: 'basket', color: 1, budget: 30000 }],
  transactions: [
    { id: 'a', kind: 'expense', amount: 1250, categoryId: 'food', date: '2026-11-03', note: 'Pain', createdAt: 1 },
  ],
  settings: { theme: 'frogs', currency: 'USD', motion: false },
};

describe('readBackup', () => {
  it('accepts its own export', () => {
    const backup = readBackup(JSON.stringify(valid), fallback);
    expect(backup.categories).toHaveLength(1);
    expect(backup.transactions).toHaveLength(1);
    expect(backup.settings).toEqual(valid.settings);
  });

  it('reads the kanji of version 1 files as icons', () => {
    const v1 = { ...valid, version: 1, categories: [{ ...valid.categories[0], icon: undefined, glyph: '食' }] };
    expect(readBackup(JSON.stringify(v1), fallback).categories[0]?.icon).toBe('basket');
  });

  it('rejects files from elsewhere', () => {
    expect(() => readBackup('not json', fallback)).toThrow();
    expect(() => readBackup(JSON.stringify({ ...valid, app: 'other' }), fallback)).toThrow();
    expect(() => readBackup(JSON.stringify({ ...valid, categories: [] }), fallback)).toThrow();
  });

  it('drops broken entries and orphans', () => {
    const backup = readBackup(
      JSON.stringify({
        ...valid,
        transactions: [
          ...valid.transactions,
          { id: 'b', kind: 'expense', amount: 12.5, categoryId: 'food', date: '2026-11-03' },
          { id: 'c', kind: 'expense', amount: 100, categoryId: 'ghost', date: '2026-11-03' },
          { id: 'd', kind: 'gift', amount: 100, categoryId: 'food', date: '2026-11-03' },
          { id: 'e', kind: 'income', amount: 100, categoryId: 'food', date: '03/11/2026' },
        ],
      }),
      fallback,
    );
    expect(backup.transactions.map((t) => t.id)).toEqual(['a']);
  });

  it('falls back on unknown settings', () => {
    const backup = readBackup(JSON.stringify({ ...valid, settings: { theme: 'dragons', currency: 'euro' } }), fallback);
    expect(backup.settings).toEqual(fallback);
  });
});
