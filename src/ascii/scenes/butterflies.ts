import type { SceneSpec, World } from '../engine';
import { type Grid, tone } from '../grid';
import { TAU, clamp, noise, pick, rand, turnToward } from '../math';

const C = { Air: 0, Body: 1, Petal: 2 } as const;

/** Each species is three roles in a row: wing, wing rim, spots. */
const SPECIES = {
  morpho: 3,
  monarch: 6,
  kiageha: 9,
  monshiro: 12,
} as const;
const KINDS = [SPECIES.morpho, SPECIES.morpho, SPECIES.monarch, SPECIES.kiageha, SPECIES.monshiro];

const WING = '*'.charCodeAt(0);
const WING_SOFT = '+'.charCodeAt(0);
const RIM = '#'.charCodeAt(0);
const SPOT = 'o'.charCodeAt(0);
const BAR = '|'.charCodeAt(0);
const PETALS = [',', '.', "'", '*', '`'].map((c) => c.charCodeAt(0));

interface Butterfly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  size: number;
  phase: number;
  /** Flaps per second; rises when fleeing. */
  beat: number;
  species: number;
  seed: number;
  depth: number;
}

interface Petal {
  x: number;
  y: number;
  speed: number;
  spin: number;
  alpha: number;
}

function spawn(world: World): Butterfly {
  return {
    x: rand(0, world.width),
    y: rand(0, world.height),
    vx: 0,
    vy: 0,
    heading: rand(0, TAU),
    size: clamp(Math.min(world.width, world.height) * 0.15, 40, 80) * rand(0.75, 1.15),
    phase: rand(0, TAU),
    beat: rand(2.2, 3.2),
    species: pick(KINDS),
    seed: rand(0, 1000),
    depth: rand(0.6, 1),
  };
}

function update(b: Butterfly, dt: number, world: World) {
  const { pointer, width, height, time } = world;
  b.heading += (noise(b.seed, time * 0.35) - 0.5) * 4 * dt;
  let speed = 38;
  let beat = 2.6;
  if (pointer.active) {
    const dx = b.x - pointer.x;
    const dy = b.y - pointer.y;
    const d = Math.hypot(dx, dy);
    if (d < 150) {
      b.heading = Math.atan2(dy, dx);
      speed = 110;
      beat = 5;
    }
  }
  b.beat += (beat - b.beat) * Math.min(1, dt * 2);
  b.phase += b.beat * TAU * dt;
  // Wings push on the downstroke, so flight bobs with the beat.
  const lift = Math.max(0, Math.sin(b.phase)) * 26;
  b.vx += (Math.cos(b.heading) * speed - b.vx) * Math.min(1, dt * 1.5);
  b.vy += (Math.sin(b.heading) * speed - lift - b.vy + 10) * Math.min(1, dt * 1.5);
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  // Past the edge, head back in so the screen never empties.
  const margin = b.size * 0.5;
  if (b.x < -margin || b.x > width + margin || b.y < -margin || b.y > height + margin) {
    b.heading = turnToward(b.heading, Math.atan2(height / 2 - b.y, width / 2 - b.x), dt * 2.5);
  }
}

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): number {
  return Math.hypot((x - cx) / rx, (y - cy) / ry);
}

function draw(grid: Grid, b: Butterfly, z: number) {
  const { x, y, size, depth, species } = b;
  // Seen from the front: the wings fold toward the body and open again.
  const open = 0.18 + 0.82 * Math.abs(Math.cos(b.phase / 2));
  const wing = tone(species, depth);
  const rim = tone(species + 1, depth);
  const spot = tone(species + 2, depth);

  grid.cells(x - size * 1.05 * open, y - size * 0.75, x + size * 1.05 * open, y + size * 0.62, (col, row, cx, cy) => {
    const side = cx < x ? -1 : 1;
    const upper = inEllipse(cx, cy, x + side * size * 0.5 * open, y - size * 0.26, size * 0.52 * open + 1, size * 0.44);
    const lower = inEllipse(cx, cy, x + side * size * 0.36 * open, y + size * 0.28, size * 0.38 * open + 1, size * 0.32);
    const q = Math.min(upper, lower);
    if (q > 1) return;
    const tip = inEllipse(cx, cy, x + side * size * 0.72 * open, y - size * 0.42, size * 0.13 * open + 1, size * 0.12);
    if (tip < 1 && open > 0.4) grid.put(col, row, SPOT, spot, z);
    else if (q > 0.72) grid.put(col, row, RIM, rim, z);
    else grid.put(col, row, q < 0.45 ? WING : WING_SOFT, wing, z);
  });

  const body = tone(C.Body, depth);
  grid.line(x, y - size * 0.32, x, y + size * 0.42, body, z + 0.01, BAR);
  grid.line(x, y - size * 0.36, x - size * 0.22, y - size * 0.76, tone(C.Body, depth * 0.6), z + 0.01);
  grid.line(x, y - size * 0.36, x + size * 0.22, y - size * 0.76, tone(C.Body, depth * 0.6), z + 0.01);
}

export const butterflies: SceneSpec = {
  colors: [
    '#6f7fa6', '#d6d0c2', '#e7a3b8',
    '#4f9bff', '#2c4f8f', '#e8edf5',
    '#e8823a', '#6a4632', '#f1ece2',
    '#e6c84f', '#6a5c38', '#6aa0e8',
    '#ece8dc', '#6c6a72', '#9aa0b4',
  ],
  create(world) {
    const count = clamp(Math.round((world.width * world.height) / 55000), 5, 12);
    const flock = Array.from({ length: count }, () => spawn(world)).sort((a, b) => a.depth - b.depth);
    const petals: Petal[] = Array.from({ length: Math.round((world.width * world.height) / 14000) }, () => ({
      x: rand(0, world.width),
      y: rand(0, world.height),
      speed: rand(10, 22),
      spin: rand(0, TAU),
      alpha: rand(0.35, 0.8),
    }));

    return {
      update(dt, w) {
        for (const b of flock) update(b, dt, w);
        for (const p of petals) {
          p.spin += dt * 2.5;
          p.x += (p.speed + Math.sin(p.spin) * 8) * dt;
          p.y += (p.speed * 0.55 + Math.cos(p.spin * 0.7) * 6) * dt;
          if (p.x > w.width + 10 || p.y > w.height + 10) {
            if (Math.random() < 0.5) {
              p.x = -10;
              p.y = rand(0, w.height);
            } else {
              p.x = rand(0, w.width);
              p.y = -10;
            }
          }
        }
      },
      draw(grid, w) {
        for (const p of petals) {
          const ch = PETALS[Math.floor((p.spin / TAU) * PETALS.length) % PETALS.length];
          grid.putPx(p.x, p.y, ch, tone(C.Petal, p.alpha), 0.5);
        }
        const gust = Math.floor(w.time * 0.5);
        for (let i = 0; i < 4; i++) {
          // A few faint streaks of wind cross the screen.
          const y = ((noise(gust, i * 7) * 1.4 - 0.2) * w.height) | 0;
          const x = ((w.time * 0.5 - gust) * 1.6 - 0.3) * w.width;
          grid.line(x, y, x + w.width * 0.18, y + 6, tone(C.Air, 0.3), 0.1, '~'.charCodeAt(0));
        }
        flock.forEach((b, i) => draw(grid, b, 2 + i));
      },
      poke(x, y) {
        for (const b of flock) {
          const dx = b.x - x;
          const dy = b.y - y;
          const d = Math.hypot(dx, dy);
          if (d < 240) {
            b.heading = Math.atan2(dy, dx);
            b.vx += Math.cos(b.heading) * 120;
            b.vy += Math.sin(b.heading) * 120;
            b.beat = 6;
          }
        }
      },
    };
  },
};
