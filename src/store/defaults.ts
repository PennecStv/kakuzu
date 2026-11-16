import type { Category } from './types';

/** Starter set. Ids are stable so a reset or an import never orphans entries. */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'home', kind: 'expense', name: 'Logement', glyph: '家', color: 0 },
  { id: 'food', kind: 'expense', name: 'Alimentation', glyph: '食', color: 1 },
  { id: 'transport', kind: 'expense', name: 'Transport', glyph: '車', color: 2 },
  { id: 'leisure', kind: 'expense', name: 'Loisirs', glyph: '遊', color: 3 },
  { id: 'shopping', kind: 'expense', name: 'Shopping', glyph: '買', color: 4 },
  { id: 'health', kind: 'expense', name: 'Santé', glyph: '医', color: 5 },
  { id: 'subscriptions', kind: 'expense', name: 'Abonnements', glyph: '契', color: 6 },
  { id: 'other-expense', kind: 'expense', name: 'Autres', glyph: '他', color: 7 },
  { id: 'salary', kind: 'income', name: 'Salaire', glyph: '給', color: 2 },
  { id: 'side', kind: 'income', name: 'Revenus annexes', glyph: '副', color: 6 },
  { id: 'other-income', kind: 'income', name: 'Autres revenus', glyph: '他', color: 0 },
];

/** Glyphs offered when creating a category. Any single character can still be typed. */
export const GLYPHS = [
  '家', '食', '車', '遊', '買', '医', '契', '他', '給', '副',
  '酒', '茶', '服', '本', '旅', '猫', '犬', '子', '学', '贈',
  '税', '電', '水', '火', '光', '音', '映', '球', '花', '金',
];

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'JPY'];
