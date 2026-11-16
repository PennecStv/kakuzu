/**
 * Category icons, saved by id so the drawing library can change without
 * touching stored data. The order is the picker's.
 */
export const ICONS = [
  'house', 'basket', 'utensils', 'coffee', 'wine', 'bag',
  'shirt', 'car', 'train', 'bike', 'fuel', 'plane',
  'health', 'pill', 'sport', 'ticket', 'film', 'music',
  'game', 'book', 'school', 'baby', 'cat', 'dog',
  'gift', 'flower', 'scissors', 'phone', 'wifi', 'bolt',
  'droplet', 'flame', 'repeat', 'tax', 'shield', 'wrench',
  'briefcase', 'hand-coins', 'coins', 'piggy-bank', 'tag', 'more',
] as const;

export type IconId = (typeof ICONS)[number];

export const isIconId = (v: unknown): v is IconId => ICONS.includes(v as IconId);

// Version 1 drew categories with a kanji. These are the ones its picker offered.
const FROM_KANJI: Record<string, IconId> = {
  家: 'house', 食: 'basket', 車: 'car', 遊: 'ticket', 買: 'bag', 医: 'health', 契: 'repeat', 他: 'more',
  給: 'briefcase', 副: 'hand-coins', 酒: 'wine', 茶: 'coffee', 服: 'shirt', 本: 'book', 旅: 'plane',
  猫: 'cat', 犬: 'dog', 子: 'baby', 学: 'school', 贈: 'gift', 税: 'tax', 電: 'bolt', 水: 'droplet',
  火: 'flame', 光: 'bolt', 音: 'music', 映: 'film', 球: 'sport', 花: 'flower', 金: 'coins',
};

/** The icon replacing a version 1 kanji. A character typed by hand gets a plain tag. */
export function iconFromKanji(glyph: string): IconId {
  return FROM_KANJI[glyph] ?? 'tag';
}
