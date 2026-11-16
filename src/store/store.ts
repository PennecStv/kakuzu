import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Backup } from './backup';
import { DEFAULT_CATEGORIES } from './defaults';
import type { Category, Kind, Settings, Transaction } from './types';

export interface State {
  categories: Category[];
  transactions: Transaction[];
  settings: Settings;
}

interface Actions {
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void;
  /** Returns the removed entry so the caller can offer an undo. */
  deleteTransaction: (id: string) => Transaction | undefined;
  restoreTransaction: (t: Transaction) => void;
  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, patch: Partial<Omit<Category, 'id' | 'kind'>>) => void;
  /** Moves the category's entries to `fallbackId` before removing it. */
  deleteCategory: (id: string, fallbackId: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  importBackup: (backup: Pick<Backup, 'categories' | 'transactions' | 'settings'>) => void;
  reset: () => void;
}

export const initialState: State = {
  categories: DEFAULT_CATEGORIES,
  transactions: [],
  settings: { theme: 'koi', currency: 'EUR', motion: true },
};

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addTransaction: (t) =>
        set((s) => ({
          transactions: [...s.transactions, { ...t, id: crypto.randomUUID(), createdAt: Date.now() }],
        })),

      updateTransaction: (id, patch) =>
        set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

      deleteTransaction: (id) => {
        const removed = get().transactions.find((t) => t.id === id);
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
        return removed;
      },

      restoreTransaction: (t) => set((s) => ({ transactions: [...s.transactions, t] })),

      addCategory: (c) => set((s) => ({ categories: [...s.categories, { ...c, id: crypto.randomUUID() }] })),

      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      deleteCategory: (id, fallbackId) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          transactions: s.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: fallbackId } : t)),
        })),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      importBackup: ({ categories, transactions, settings }) => set({ categories, transactions, settings }),

      reset: () => set({ categories: DEFAULT_CATEGORIES, transactions: [] }),
    }),
    {
      name: 'kakuzu',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ categories, transactions, settings }) => ({ categories, transactions, settings }),
    },
  ),
);

export function categoriesOf(categories: Category[], kind: Kind): Category[] {
  return categories.filter((c) => c.kind === kind);
}
