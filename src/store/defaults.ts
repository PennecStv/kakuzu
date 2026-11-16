import type { Category } from './types';

/** Starter set. Ids are stable so a reset or an import never orphans entries. */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'home', kind: 'expense', name: 'Logement', icon: 'house', color: 0 },
  { id: 'food', kind: 'expense', name: 'Alimentation', icon: 'basket', color: 1 },
  { id: 'transport', kind: 'expense', name: 'Transport', icon: 'car', color: 2 },
  { id: 'leisure', kind: 'expense', name: 'Loisirs', icon: 'ticket', color: 3 },
  { id: 'shopping', kind: 'expense', name: 'Shopping', icon: 'bag', color: 4 },
  { id: 'health', kind: 'expense', name: 'Santé', icon: 'health', color: 5 },
  { id: 'subscriptions', kind: 'expense', name: 'Abonnements', icon: 'repeat', color: 6 },
  { id: 'other-expense', kind: 'expense', name: 'Autres', icon: 'more', color: 7 },
  { id: 'salary', kind: 'income', name: 'Salaire', icon: 'briefcase', color: 2 },
  { id: 'side', kind: 'income', name: 'Revenus annexes', icon: 'hand-coins', color: 6 },
  { id: 'other-income', kind: 'income', name: 'Autres revenus', icon: 'more', color: 0 },
];


export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'JPY'];
