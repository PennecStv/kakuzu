import type { DayKey } from '../lib/dates';

export type Kind = 'expense' | 'income';

export type ThemeId = 'koi' | 'butterflies' | 'herons' | 'frogs' | 'jellyfish';

export interface Category {
  id: string;
  kind: Kind;
  name: string;
  /** One kanji (or any single character) shown as the category icon. */
  glyph: string;
  /** Slot in the categorical palette, 0 to 7. */
  color: number;
  /** Monthly limit in minor units, expenses only. */
  budget?: number;
}

export interface Transaction {
  id: string;
  kind: Kind;
  /** Positive amount in minor units (cents). */
  amount: number;
  categoryId: string;
  date: DayKey;
  note: string;
  createdAt: number;
}

export interface Settings {
  theme: ThemeId;
  currency: string;
  motion: boolean;
}
