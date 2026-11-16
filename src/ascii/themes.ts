import type { ThemeId } from '../store/types';
import type { SceneSpec } from './engine';
import { butterflies } from './scenes/butterflies';
import { frogs } from './scenes/frogs';
import { herons } from './scenes/herons';
import { jellyfish } from './scenes/jellyfish';
import { koi } from './scenes/koi';

export interface Theme {
  id: ThemeId;
  name: string;
  kanji: string;
  /** Romaji reading of the kanji. */
  reading: string;
  /** UI accent: buttons, active tab, focus rings. */
  accent: string;
  scene: SceneSpec;
}

export const THEMES: Record<ThemeId, Theme> = {
  koi: { id: 'koi', name: 'Carpes koï', kanji: '鯉', reading: 'koi', accent: '#e8604a', scene: koi },
  butterflies: { id: 'butterflies', name: 'Papillons', kanji: '蝶', reading: 'chō', accent: '#5b9cf0', scene: butterflies },
  herons: { id: 'herons', name: 'Hérons', kanji: '鷺', reading: 'sagi', accent: '#9db8d6', scene: herons },
  frogs: { id: 'frogs', name: 'Grenouilles', kanji: '蛙', reading: 'kaeru', accent: '#6cc070', scene: frogs },
  jellyfish: { id: 'jellyfish', name: 'Méduses', kanji: '海月', reading: 'kurage', accent: '#d36be0', scene: jellyfish },
};
