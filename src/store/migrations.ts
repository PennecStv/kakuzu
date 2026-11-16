import { iconFromKanji } from './icons';
import type { State } from './store';
import type { Category } from './types';

type V1Category = Omit<Category, 'icon'> & { glyph?: string };
type V1State = Omit<State, 'categories'> & { categories: V1Category[] };

/** Brings a state saved by an older version up to the current shape. */
export function migrate(persisted: unknown, version: number): State {
  if (version >= 2) return persisted as State;
  // Version 2 replaced each category's kanji with an icon id.
  const v1 = persisted as V1State;
  return {
    ...v1,
    categories: v1.categories.map(({ glyph, ...rest }) => ({ ...rest, icon: iconFromKanji(glyph ?? '') })),
  };
}
