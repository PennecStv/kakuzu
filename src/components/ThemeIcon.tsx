import { createLucideIcon, type LucideIcon } from 'lucide-react';
import type { ThemeId } from '../store/types';

// Lucide has no koi, butterfly, heron, frog or jellyfish. These are drawn on its
// 24 px grid with its 2 px stroke so they sit with the other icons.
const ANIMALS: Record<ThemeId, LucideIcon> = {
  koi: createLucideIcon('koi', [
    ['path', { d: 'M3 12c2-3 5-4.5 8-4.5 3.5 0 5.5 2 7 4.5-1.5 2.5-3.5 4.5-7 4.5-3 0-6-1.5-8-4.5z', key: 'body' }],
    ['path', { d: 'M18 12c1-1.8 2.3-3 3.5-3.5-.4 1.2-.6 2.3-.6 3.5s.2 2.3.6 3.5c-1.2-.5-2.5-1.7-3.5-3.5z', key: 'tail' }],
    ['path', { d: 'M6.5 11h.01', key: 'eye' }],
    ['path', { d: 'M3.5 13c-.6.8-.8 1.8-.5 2.8', key: 'barbel' }],
    ['path', { d: 'M10 7.6c.8-1.4 2.2-2.4 4-2.6-.2.9-.2 1.8.1 2.8', key: 'dorsal' }],
    ['path', { d: 'M10.5 16.4c-.3 1.2 0 2.3.9 3', key: 'fin' }],
  ]),
  butterflies: createLucideIcon('butterfly', [
    ['path', { d: 'M12 7.5v11', key: 'body' }],
    ['path', { d: 'M12 7.5 10.5 4', key: 'antenna-l' }],
    ['path', { d: 'M12 7.5 13.5 4', key: 'antenna-r' }],
    ['path', { d: 'M12 10C10.5 6.5 7.5 4.5 5 4.5c-1.5 0-2 1.3-1.6 3 .6 2.4 2.8 4.5 8.6 4.5', key: 'wing-tl' }],
    ['path', { d: 'M12 10c1.5-3.5 4.5-5.5 7-5.5 1.5 0 2 1.3 1.6 3-.6 2.4-2.8 4.5-8.6 4.5', key: 'wing-tr' }],
    ['path', { d: 'M12 12c-3.5 0-6 1.3-6 3.7 0 1.6 1.2 2.6 2.6 2.4 1.7-.2 3-2 3.4-4.1', key: 'wing-bl' }],
    ['path', { d: 'M12 12c3.5 0 6 1.3 6 3.7 0 1.6-1.2 2.6-2.6 2.4-1.7-.2-3-2-3.4-4.1', key: 'wing-br' }],
  ]),
  herons: createLucideIcon('heron', [
    ['path', { d: 'M2.5 6.5 7 5.5', key: 'beak' }],
    ['path', { d: 'M7 5.5c.4-1.3 1.6-2 2.8-1.7 1.3.3 1.9 1.6 1.3 2.8L9.6 9.5c-.7 1.3-.3 2.6 1 3.2', key: 'neck' }],
    ['path', { d: 'M10.6 12.7c1.8-1.6 4.5-2 6.8-1 1.5.7 2.8 2 3.6 3.8-2.6.6-5.5.6-8 0-1.2-.4-2-1.4-2.4-2.8z', key: 'body' }],
    ['path', { d: 'M13.5 15.3V21', key: 'leg-l' }],
    ['path', { d: 'M16 15.5V21', key: 'leg-r' }],
    ['path', { d: 'M10.8 4.5 14 4', key: 'crest' }],
  ]),
  frogs: createLucideIcon('frog', [
    ['circle', { cx: '8', cy: '6.5', r: '2', key: 'eye-l' }],
    ['circle', { cx: '16', cy: '6.5', r: '2', key: 'eye-r' }],
    ['path', { d: 'M6.2 7.8C4.2 9 3 11 3 13.5 3 17 7 19.5 12 19.5s9-2.5 9-6c0-2.5-1.2-4.5-3.2-5.7', key: 'body' }],
    ['path', { d: 'M8.5 12.5c2 1.2 5 1.2 7 0', key: 'mouth' }],
    ['path', { d: 'M7 18.5 5 21', key: 'foot-l' }],
    ['path', { d: 'M17 18.5l2 2.5', key: 'foot-r' }],
  ]),
  jellyfish: createLucideIcon('jellyfish', [
    ['path', { d: 'M4 12C4 7.3 7.6 4 12 4s8 3.3 8 8c-1.3.8-2.7.8-4 0-1.3.8-2.7.8-4 0-1.3.8-2.7.8-4 0-1.3.8-2.7.8-4 0z', key: 'bell' }],
    ['path', { d: 'M8 14c-.8 1.4.8 2.6 0 4s.6 2.4 0 3.5', key: 'arm-l' }],
    ['path', { d: 'M12 14c-.8 1.4.8 2.6 0 4s.6 2.4 0 3.5', key: 'arm-c' }],
    ['path', { d: 'M16 14c-.8 1.4.8 2.6 0 4s.6 2.4 0 3.5', key: 'arm-r' }],
  ]),
};

export function ThemeIcon({ theme, className }: { theme: ThemeId; className?: string }) {
  const Shape = ANIMALS[theme];
  return <Shape className={className} aria-hidden="true" />;
}
