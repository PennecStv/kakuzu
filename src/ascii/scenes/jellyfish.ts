import type { SceneSpec, World } from '../engine';
import { type Grid, lineGlyph, tone } from '../grid';
import { TAU, cellHash, clamp, noise, pick, rand } from '../math';

const C = { Snow: 0, Ray: 1, Moon: 2, Nettle: 3, Glow: 4, Violet: 5 } as const;
const SPECIES = [C.Moon, C.Moon, C.Nettle, C.Glow, C.Violet];

const TENTACLE_NODES = 12;
const ARM_NODES = 8;
const O = 'o'.charCodeAt(0);
const PERCENT = '%'.charCodeAt(0);
const COLON = ':'.charCodeAt(0);
const DOT = '.'.charCodeAt(0);
const TILDE = '~'.charCodeAt(0);
const COMMA = ','.charCodeAt(0);
const BACKSLASH = '\\'.charCodeAt(0);

interface Point {
  x: number;
  y: number;
}

interface Jelly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  rate: number;
  color: number;
  depth: number;
  seed: number;
  tentacles: Point[][];
  arms: Point[][];
}

interface Flake {
  x: number;
  y: number;
  speed: number;
  ch: number;
  alpha: number;
}

/** Fast squeeze, slow release: the shape of a real bell pulse, from 0 to 1. */
function contraction(phase: number): number {
  const p = (phase % TAU) / TAU;
  return p < 0.25 ? Math.sin((p / 0.25) * (Math.PI / 2)) : Math.cos(((p - 0.25) / 0.75) * (Math.PI / 2));
}

function chain(x: number, y: number, count: number, step: number): Point[] {
  return Array.from({ length: count }, (_, i) => ({ x, y: y + i * step }));
}

function spawn(world: World, y?: number): Jelly {
  const radius = clamp(Math.min(world.width, world.height) * 0.13, 36, 80) * rand(0.7, 1.15);
  const x = rand(radius, world.width - radius);
  const top = y ?? rand(0, world.height);
  const tentacleCount = Math.round(rand(6, 9));
  return {
    x,
    y: top,
    vx: 0,
    vy: 0,
    radius,
    phase: rand(0, TAU),
    rate: rand(0.45, 0.75) * TAU,
    color: pick(SPECIES),
    depth: rand(0.5, 1),
    seed: rand(0, 1000),
    tentacles: Array.from({ length: tentacleCount }, (_, i) =>
      chain(x + radius * (-0.85 + (1.7 * i) / (tentacleCount - 1)), top, TENTACLE_NODES, radius * 0.3),
    ),
    arms: [-0.2, 0, 0.2].map((o) => chain(x + radius * o, top, ARM_NODES, radius * 0.22)),
  };
}

/** Each node hangs from the previous one, pulled down and swayed by the current. */
function trail(points: Point[], ax: number, ay: number, step: number, sway: number) {
  points[0].x = ax;
  points[0].y = ay;
  for (let j = 1; j < points.length; j++) {
    const prev = points[j - 1];
    const p = points[j];
    const dx = p.x - prev.x + Math.sin(sway + j * 0.45) * step * 0.35;
    const dy = p.y - prev.y + step * 0.6;
    const d = Math.hypot(dx, dy) || 1;
    p.x = prev.x + (dx / d) * step;
    p.y = prev.y + (dy / d) * step;
  }
}

function update(j: Jelly, dt: number, world: World) {
  j.phase += j.rate * dt;
  const squeeze = contraction(j.phase);
  j.vy -= squeeze * j.radius * 1.6 * dt;
  j.vy += 9 * dt;
  j.vx += (noise(j.seed, world.time * 0.2) - 0.5) * 30 * dt;
  const { pointer } = world;
  if (pointer.active) {
    const dx = j.x - pointer.x;
    const dy = j.y - pointer.y;
    const d = Math.hypot(dx, dy);
    if (d < 170 && d > 0) {
      j.vx += (dx / d) * 90 * dt;
      j.vy += (dy / d) * 90 * dt;
    }
  }
  const drag = 1 - Math.min(1, 1.3 * dt);
  j.vx *= drag;
  j.vy *= drag;
  j.x += j.vx * dt;
  j.y += j.vy * dt;
  if (j.x < -j.radius) j.x = world.width + j.radius;
  if (j.x > world.width + j.radius) j.x = -j.radius;

  const rx = j.radius * (1 - 0.16 * squeeze);
  const sway = world.time * 1.3 + j.seed;
  const count = j.tentacles.length;
  j.tentacles.forEach((t, i) => trail(t, j.x + rx * (-0.85 + (1.7 * i) / (count - 1)), j.y + j.radius * 0.1, j.radius * 0.3, sway + i));
  j.arms.forEach((a, i) => trail(a, j.x + rx * (i - 1) * 0.2, j.y + j.radius * 0.1, j.radius * 0.22, sway * 0.7 + i * 2));
}

function draw(grid: Grid, j: Jelly, z: number) {
  const squeeze = contraction(j.phase);
  const rx = j.radius * (1 - 0.16 * squeeze);
  const ry = j.radius * 0.72 * (1 + 0.14 * squeeze);
  const { depth, color } = j;

  for (const t of j.tentacles) {
    for (let i = 1; i < t.length; i++) {
      const fade = 1 - i / t.length;
      grid.line(t[i - 1].x, t[i - 1].y, t[i].x, t[i].y, tone(color, depth * (0.25 + fade * 0.6)), z - 0.02);
    }
  }
  for (const a of j.arms) {
    for (let i = 1; i < a.length; i++) {
      const r = j.radius * 0.1 * (1 - i / a.length) + 2;
      grid.taper(a[i - 1].x, a[i - 1].y, a[i].x, a[i].y, r, r, '.:;%', tone(color, depth * 0.7), z - 0.01);
    }
  }

  grid.cells(j.x - rx, j.y - ry, j.x + rx, j.y + ry * 0.3, (col, row, x, y) => {
    const dx = (x - j.x) / rx;
    const dy = (y - j.y) / ry;
    if (dy > 0) {
      // The scalloped margin under the bell.
      if (Math.abs(dx) <= 1 && dy < 0.22 + 0.08 * Math.sin(dx * 9 + j.phase)) {
        grid.put(col, row, (col + row) % 2 ? TILDE : COMMA, tone(color, depth * 0.9), z);
      }
      return;
    }
    const q = Math.hypot(dx, dy);
    if (q > 1) return;
    const a = Math.atan2(dy, dx);
    if (q > 0.8) {
      grid.put(col, row, lineGlyph(-rx * Math.sin(a), ry * Math.cos(a)), tone(color, depth), z);
    } else if (q > 0.28 && q < 0.55 && Math.cos(4 * a + 0.8) > 0.35) {
      // Four gonads in a clover, the mark of a moon jelly.
      grid.put(col, row, q < 0.42 ? O : PERCENT, tone(color, depth * 0.85), z);
    } else if (noise(col * 0.7, row * 0.7 + j.phase * 0.3) > 0.5) {
      grid.put(col, row, q < 0.5 ? DOT : COLON, tone(color, depth * 0.45), z);
    }
  });
}

/** Three slanted shafts of light from the surface, flickering. */
function drawRays(grid: Grid, world: World) {
  const { width, height, time } = world;
  const rays = [0.18, 0.47, 0.8];
  for (let row = 0; row < grid.rows; row++) {
    const y = (row + 0.5) * grid.cellH;
    const fall = 1 - y / (height * 0.85);
    if (fall <= 0) break;
    for (let col = 0; col < grid.cols; col++) {
      if (cellHash(col, row) < 0.7) continue;
      const x = (col + 0.5) * grid.cellW;
      let light = 0;
      for (const r of rays) {
        const center = r * width + y * 0.38 + Math.sin(time * 0.3 + r * 9) * 18;
        light = Math.max(light, 1 - Math.abs(x - center) / (width * 0.06));
      }
      const glow = light * fall * (0.6 + 0.4 * noise(col * 0.2, time * 0.5));
      if (glow > 0.3) grid.put(col, row, BACKSLASH, tone(C.Ray, glow * 0.35), 0);
    }
  }
}

export const jellyfish: SceneSpec = {
  colors: ['#5d7bb0', '#6f8fc4', '#bfe6f2', '#e9a25a', '#d36be0', '#9a86f0'],
  create(world) {
    const count = clamp(Math.round((world.width * world.height) / 75000), 4, 9);
    const jellies = Array.from({ length: count }, () => spawn(world)).sort((a, b) => a.depth - b.depth);
    const snow: Flake[] = Array.from({ length: Math.round((world.width * world.height) / 9000) }, () => ({
      x: rand(0, world.width),
      y: rand(0, world.height),
      speed: rand(5, 14),
      ch: pick([DOT, DOT, COMMA, "'".charCodeAt(0)]),
      alpha: rand(0.25, 0.6),
    }));

    return {
      update(dt, w) {
        jellies.forEach((j, i) => {
          update(j, dt, w);
          if (j.y < -j.radius * 4.5) jellies[i] = { ...spawn(w, w.height + j.radius), depth: j.depth };
        });
        for (const f of snow) {
          f.y += f.speed * dt;
          f.x += Math.sin(w.time * 0.4 + f.speed) * 4 * dt;
          if (f.y > w.height) {
            f.y = -4;
            f.x = rand(0, w.width);
          }
        }
      },
      draw(grid, w) {
        drawRays(grid, w);
        for (const f of snow) grid.putPx(f.x, f.y, f.ch, tone(C.Snow, f.alpha), 0.2);
        jellies.forEach((j, i) => draw(grid, j, 2 + i));
      },
      poke(x, y) {
        for (const j of jellies) {
          const dx = j.x - x;
          const dy = j.y - y;
          const d = Math.hypot(dx, dy);
          if (d < 260 && d > 0) {
            const push = (1 - d / 260) * 160;
            j.vx += (dx / d) * push;
            j.vy += (dy / d) * push;
          }
        }
      },
    };
  },
};
