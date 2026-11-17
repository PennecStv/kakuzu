import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from './defaults';
import { fallbackCategory, initialState, useStore } from './store';

describe('fallbackCategory', () => {
  it('prefers the catch-all category of the same kind', () => {
    expect(fallbackCategory(DEFAULT_CATEGORIES, 'expense', 'transport')?.id).toBe('other-expense');
    expect(fallbackCategory(DEFAULT_CATEGORIES, 'income', 'salary')?.id).toBe('other-income');
  });

  it('takes the first one left when the catch-all is the one going away', () => {
    expect(fallbackCategory(DEFAULT_CATEGORIES, 'expense', 'other-expense')?.id).toBe('home');
  });

  it('returns nothing when no category of that kind is left', () => {
    const onlyOne = DEFAULT_CATEGORIES.filter((c) => c.kind === 'expense' || c.id === 'salary');
    expect(fallbackCategory(onlyOne, 'income', 'salary')).toBeUndefined();
  });
});

describe('store', () => {
  beforeEach(() => useStore.setState(initialState));

  it('moves entries of a deleted category', () => {
    const s = useStore.getState();
    s.addTransaction({ kind: 'expense', amount: 500, categoryId: 'transport', date: '2026-11-16', note: '' });
    s.deleteCategory('transport', 'other-expense');
    expect(useStore.getState().transactions[0]?.categoryId).toBe('other-expense');
  });

  it('restores a deleted entry into a fallback when its category is gone', () => {
    const s = useStore.getState();
    s.addTransaction({ kind: 'expense', amount: 500, categoryId: 'transport', date: '2026-11-16', note: '' });
    const id = useStore.getState().transactions[0]?.id ?? '';
    const removed = s.deleteTransaction(id);
    s.deleteCategory('transport', 'other-expense');
    if (removed) s.restoreTransaction(removed);
    expect(useStore.getState().transactions).toMatchObject([{ id, categoryId: 'other-expense' }]);
  });
});
