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
  /** Japanese name, in romaji. */
  reading: string;
  /** UI accent: buttons, active tab, focus rings, income figures, the wordmark's K. */
  accent: string;
  scene: SceneSpec;
}

export const THEMES: Record<ThemeId, Theme> = {
  koi: { id: 'koi', name: 'Carpes koï', reading: 'koi', accent: '#e8604a', scene: koi },
  butterflies: { id: 'butterflies', name: 'Papillons', reading: 'chō', accent: '#5b9cf0', scene: butterflies },
  herons: { id: 'herons', name: 'Hérons', reading: 'sagi', accent: '#9db8d6', scene: herons },
  frogs: { id: 'frogs', name: 'Grenouilles', reading: 'kaeru', accent: '#6cc070', scene: frogs },
  jellyfish: { id: 'jellyfish', name: 'Méduses', reading: 'kurage', accent: '#d36be0', scene: jellyfish },
};
