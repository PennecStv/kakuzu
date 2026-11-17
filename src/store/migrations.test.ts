import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES } from './defaults';
import { iconFromKanji } from './icons';
import { migrate } from './migrations';

const settings = { theme: 'koi', currency: 'EUR', motion: true };

describe('migrate', () => {
  it('turns version 1 kanji into icons', () => {
    const v1 = {
      categories: [
        { id: 'home', kind: 'expense', name: 'Logement', glyph: '家', color: 0 },
        { id: 'x', kind: 'expense', name: 'Perso', glyph: '★', color: 3, budget: 5000 },
      ],
      transactions: [],
      settings,
    };
    expect(migrate(v1, 1).categories).toEqual([
      { id: 'home', kind: 'expense', name: 'Logement', icon: 'house', color: 0 },
      { id: 'x', kind: 'expense', name: 'Perso', icon: 'tag', color: 3, budget: 5000 },
    ]);
  });

  it('leaves current data alone', () => {
    const v2 = { categories: DEFAULT_CATEGORIES, transactions: [], settings };
    expect(migrate(v2, 2)).toBe(v2);
  });

  it('gives the version 1 defaults the icons of the new defaults', () => {
    const kanji = ['家', '食', '車', '遊', '買', '医', '契', '他', '給', '副', '他'];
    expect(kanji.map(iconFromKanji)).toEqual(DEFAULT_CATEGORIES.map((c) => c.icon));
  });
});
