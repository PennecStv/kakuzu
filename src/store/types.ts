import type { DayKey, MonthKey } from '../lib/dates';
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
  /** The recurring entry that added it, if any. */
  recurringId?: string;
}

/** An entry added on the 1st of every month. */
export interface Recurring {
  id: string;
  kind: Kind;
  /** Positive amount in minor units. */
  amount: number;
  categoryId: string;
  note: string;
  /** Next month to add it to: moved on as soon as it is added, so a month never gets it twice. */
  next: MonthKey;
}

/** Money put aside by hand for a project, outside the entries. */
export interface Goal {
  id: string;
  name: string;
  /** Amount to reach, in minor units. */
  target: number;
  /** Amount put aside so far, in minor units, never negative. */
  saved: number;
  /** Day the target should be reached by. */
  deadline?: DayKey;
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
  reminders: Reminders;
}

export interface Reminders {
  /** Days before its deadline a goal short of its target turns red, and its notification comes. */
  days: number;
  /** Phone notifications, which only the Android app can schedule. */
  notify: boolean;
  /** Hour of the day notifications come at, 0 to 23. */
  hour: number;
}
