import { DEFAULT_REMINDERS } from './defaults';
import { iconFromKanji } from './icons';
import type { State } from './store';
import type { Category, Settings } from './types';

type V2State = Omit<State, 'settings' | 'recurring'> & { settings: Omit<Settings, 'carryOver' | 'reminders'> };
type V1Category = Omit<Category, 'icon'> & { glyph?: string };
type V1State = Omit<V2State, 'categories'> & { categories: V1Category[] };

/** Brings a state saved by an older version up to the current shape. */
export function migrate(persisted: unknown, version: number): State {
  if (version >= 3) return persisted as State;
  return fromV2(version < 2 ? fromV1(persisted as V1State) : (persisted as V2State));
}

/** Version 2 replaced each category's kanji with an icon id. */
function fromV1(v1: V1State): V2State {
  return {
    ...v1,
    categories: v1.categories.map(({ glyph, ...rest }) => ({ ...rest, icon: iconFromKanji(glyph ?? '') })),
  };
}

/** Version 3 adds recurring entries and goal reminders, and carries the balance over by default. */
function fromV2(v2: V2State): State {
  return { ...v2, recurring: [], settings: { ...v2.settings, carryOver: true, reminders: DEFAULT_REMINDERS } };
}
