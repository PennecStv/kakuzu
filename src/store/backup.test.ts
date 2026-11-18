import { describe, expect, it } from 'vitest';
import { readBackup } from './backup';
import { homeOrder } from './defaults';
import type { Settings } from './types';

const fallback: Settings = { theme: 'koi', currency: 'EUR', motion: true, carryOver: true };

const valid = {
  app: 'kakuzu',
  version: 2,
  categories: [{ id: 'food', kind: 'expense', name: 'Alimentation', icon: 'basket', color: 1, budget: 30000 }],
  transactions: [
    { id: 'a', kind: 'expense', amount: 1250, categoryId: 'food', date: '2026-11-03', note: 'Pain', createdAt: 1 },
  ],
  settings: { theme: 'frogs', currency: 'USD', motion: false, carryOver: false },
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

  it('keeps fixed category colors and drops malformed ones', () => {
    const categories = [
      { ...valid.categories[0], color: '#1BB3BA' },
      { ...valid.categories[0], id: 'bad', color: 'red;background:url(x)' },
    ];
    const backup = readBackup(JSON.stringify({ ...valid, categories }), fallback);
    expect(backup.categories.map((c) => c.color)).toEqual(['#1bb3ba']);
  });

  it('reads goals, and none from older files', () => {
    expect(readBackup(JSON.stringify(valid), fallback).goals).toEqual([]);
    const goals = [
      { id: 'pc', name: 'PC neuf', target: 120000, saved: 30000, deadline: '2026-12-31' },
      { id: 'bad', name: 'Sans cible', target: 0, saved: 0 },
      { id: 'trip', name: 'Voyage', target: 90000, saved: 0, deadline: '31/12/2026' },
    ];
    expect(readBackup(JSON.stringify({ ...valid, goals }), fallback).goals).toEqual([
      goals[0],
      { id: 'trip', name: 'Voyage', target: 90000, saved: 0 },
    ]);
  });

  it('reads recurring entries, and none from older files', () => {
    expect(readBackup(JSON.stringify(valid), fallback).recurring).toEqual([]);
    const recurring = [
      { id: 'r1', kind: 'expense', amount: 65000, categoryId: 'food', note: 'Panier', next: '2026-12' },
      { id: 'r2', kind: 'expense', amount: 65000, categoryId: 'ghost', note: '', next: '2026-12' },
      { id: 'r3', kind: 'expense', amount: 65000, categoryId: 'food', note: '', next: '12/2026' },
    ];
    expect(readBackup(JSON.stringify({ ...valid, recurring }), fallback).recurring).toEqual([recurring[0]]);
  });

  it('cleans the home card order', () => {
    const settings = { ...valid.settings, home: ['trend', 'nope', 'trend', 'goals'] };
    expect(readBackup(JSON.stringify({ ...valid, settings }), fallback).settings.home).toEqual(['trend', 'goals', 'balance', 'split', 'recent']);
    expect(homeOrder(undefined)).toEqual(['balance', 'split', 'goals', 'trend', 'recent']);
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
