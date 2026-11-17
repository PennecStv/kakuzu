import { type Grid, tone } from '../grid';
import { cellHash, noise } from '../math';
import type { World } from '../engine';

const WAVE = '~'.charCodeAt(0);
const DASH = '-'.charCodeAt(0);
const DOT = '.'.charCodeAt(0);

/** Slow surface glints and a few still specks, drawn behind everything. */
export function drawWater(grid: Grid, world: World, role: number) {
  const t = world.time;
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const n = noise(col * 0.13 + t * 0.2, row * 0.5 - t * 0.05);
      if (n > 0.8) {
        grid.put(col, row, n > 0.88 ? WAVE : DASH, tone(role, (n - 0.76) * 2.4), 0);
      } else if (cellHash(col, row) > 0.988) {
        grid.put(col, row, DOT, tone(role, 0.3), 0);
      }
    }
  }
}
