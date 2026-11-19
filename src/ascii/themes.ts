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
  /** The same name in Japanese script. */
  kanji: string;
  /** UI accent: buttons, active tab, focus rings, income figures, the wordmark's K. */
  accent: string;
  scene: SceneSpec;
  /** The animal drawn still, line by line, for an empty state. */
  still: readonly string[];
}

export const THEMES: Record<ThemeId, Theme> = {
  koi: {
    id: 'koi',
    name: 'Carpes koï',
    reading: 'koi',
    kanji: '鯉',
    accent: '#e8604a',
    scene: koi,
    still: ['   ><(((°>', ' ~  ~   ~  ~'],
  },
  butterflies: {
    id: 'butterflies',
    name: 'Papillons',
    reading: 'chō',
    kanji: '蝶',
    accent: '#5b9cf0',
    scene: butterflies,
    still: ['  _  \\/  _', " ( `-()-' )", "  `-'  `-'"],
  },
  herons: {
    id: 'herons',
    name: 'Hérons',
    reading: 'sagi',
    kanji: '鷺',
    accent: '#9db8d6',
    scene: herons,
    still: ['   (°==-', '  _//', ' (__)', '~~||~~~'],
  },
  frogs: {
    id: 'frogs',
    name: 'Grenouilles',
    reading: 'kaeru',
    kanji: '蛙',
    accent: '#6cc070',
    scene: frogs,
    // The frog of the scene, sitting.
    still: [' (o)(o)', '(  ~~  )', ' ^^  ^^'],
  },
  jellyfish: {
    id: 'jellyfish',
    name: 'Méduses',
    reading: 'kurage',
    kanji: '海月',
    accent: '#d36be0',
    scene: jellyfish,
    still: ['  .-"""-.', ' (_______)', '  ) ) ( (', ' ( (   ) )'],
  },
};
