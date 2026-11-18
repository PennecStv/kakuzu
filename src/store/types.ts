import type { DayKey } from '../lib/dates';
import type { IconId } from './icons';

export type Kind = 'expense' | 'income';

export type ThemeId = 'koi' | 'butterflies' | 'herons' | 'frogs' | 'jellyfish';

export interface Category {
  id: string;
  kind: Kind;
  name: string;
  icon: IconId;
  /** Slot 0 to 7 of the categorical palette (`--cat-N`), or any "#rrggbb" picked by the user. */
  color: number | string;
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

/** Money put aside by hand for a project, outside the entries. */
export interface Goal {
  id: string;
  name: string;
  /** Amount to reach, in minor units. */
  target: number;
  /** Amount put aside so far, in minor units, never negative. */
  saved: number;
}

export type HomeCard = 'balance' | 'split' | 'goals' | 'trend' | 'recent';

export interface Settings {
  theme: ThemeId;
  currency: string;
  motion: boolean;
  /** Order of the home cards. Absent until the user changes it: read it through homeOrder. */
  home?: HomeCard[];
  /** What is left at the end of a period opens the next one. */
  carryOver: boolean;
}
