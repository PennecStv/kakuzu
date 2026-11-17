import type { Kind } from '../store/types';

/** Longest line that fits the floating message on a 360 px wide phone. */
export const QUIP_LINE_MAX = 36;

/** What the floating message says after an entry is added. "\n" marks where a line breaks. */
export const QUIPS: Record<Kind, readonly string[]> = {
  income: [
    'Pockets drenched, pockets healthy...',
    'Racks on racks on racks on racks...',
    'On God, too much money...',
    'More money than money...',
    'Money owe me money...',
    'Mansa Musa type money, haha...',
    'Ooh shit, ooh shit...\nmoney getting in my cloak.',
    'Ooh shit, ooh shit...\nmoney on the floor, hehe.',
    'Healthy amounts,\nshit keep multiplying, hehe...',
    'Money clone jutsu type shit...',
    'Getting papercuts...',
    'Oh wait, hold on...\nI have to start all over again.',
  ],
  expense: [
    'Not stonks...',
    'On se fait plaisir ici, hehe...',
    'Pockets drained, pockets sick...',
    'Racks off racks off racks...',
    'Less money than money...',
    'Money don’t owe me nothing...',
    'Mansa Musa type debt, haha...',
    'Ooh shit, ooh shit...\nmoney leaving my cloak.',
    'Ooh shit, ooh shit...\nmoney off the floor.',
    'Unhealthy amounts,\nshit keep dividing...',
    'Money clone jutsu... dispelled.',
    'One heart down, four to go...',
    'Hold on...\nwho touched my bounty money?',
  ],
};

/** A line for the floating message, never the one shown just before. */
export function pickQuip(kind: Kind, previous?: string, random: () => number = Math.random): string {
  const pool = QUIPS[kind].filter((q) => q !== previous);
  return pool[Math.floor(random() * pool.length)] ?? QUIPS[kind][0] ?? '';
}
