import type { SceneSpec, World } from '../engine';
import { type Grid, lineGlyph, tone } from '../grid';
import { cellHash, clamp, lerp, noise, rand } from '../math';

const C = { Water: 0, Moon: 1, Grey: 2, White: 3, Black: 4, Beak: 5, Reed: 6, Star: 7, Cattail: 8 } as const;

const BODY_RAMP = '.:=%#';
const DOT = '.'.charCodeAt(0);
const STAR = '*'.charCodeAt(0);
const O = 'o'.charCodeAt(0);
const COLON = ':'.charCodeAt(0);
const DASH = '-'.charCodeAt(0);
const EQUALS = '='.charCodeAt(0);
const TILDE = '~'.charCodeAt(0);
const HASH = '#'.charCodeAt(0);

type Mapper = (x: number, y: number) => [number, number];

interface Wader {
  x: number;
  facing: 1 | -1;
  size: number;
  /** 0 = neck tucked, 1 = neck up. */
  pose: number;
  poseTarget: number;
  /** 0 to 1 while striking at a fish. */
  strike: number;
  striking: boolean;
  targetX: number | null;
  step: number;
  timer: number;
}

interface Flyer {
  x: number;
  y: number;
  facing: 1 | -1;
  size: number;
  phase: number;
}

interface Reed {
  x: number;
  height: number;
  lean: number;
  seed: number;
  cattail: boolean;
}

const waterLine = (world: World) => world.height * 0.58;

/** Draws one heron through `map`, so the same code paints it and its reflection. */
function drawWader(grid: Grid, h: Wader, ground: number, map: Mapper, alpha: number, squash: number, z: number) {
  const { x, size: s, facing: f } = h;
  const at = (dx: number, dy: number) => map(x + f * dx * s, ground - dy * s);
  const taper = (a: [number, number], b: [number, number], r0: number, r1: number, role: number) =>
    grid.taper(a[0], a[1], b[0], b[1], r0 * s * squash, r1 * s * squash, BODY_RAMP, tone(role, alpha), z);
  const stroke = (a: [number, number], b: [number, number], role: number, depth = z + 0.02) =>
    grid.line(a[0], a[1], b[0], b[1], tone(role, alpha), depth);

  const stride = Math.sin(h.step) * 0.06;
  stroke(at(0, 0.42), at(-0.03 + stride, 0), C.Beak);
  stroke(at(0.02, 0.42), at(0.03 - stride, 0), C.Beak);

  taper(at(-0.26, 0.38), at(0.12, 0.52), 0.045, 0.085, C.Grey);
  taper(at(-0.02, 0.44), at(0.12, 0.5), 0.04, 0.05, C.White);

  // The neck is an S curve; pose and strike move the head along it.
  const rest: [number, number] = [0.15, 0.7];
  const up: [number, number] = [0.2, 0.96];
  const down: [number, number] = [0.46, 0.04];
  const hx = lerp(lerp(rest[0], up[0], h.pose), down[0], h.strike);
  const hy = lerp(lerp(rest[1], up[1], h.pose), down[1], h.strike);
  const bx = 0.12;
  const by = 0.56;
  const kx = bx - 0.1 * (1 - h.strike);
  const ky = (by + hy) / 2;
  let prev = at(bx, by);
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    const px = (1 - t) ** 2 * bx + 2 * (1 - t) * t * kx + t * t * hx;
    const py = (1 - t) ** 2 * by + 2 * (1 - t) * t * ky + t * t * hy;
    const next = at(px, py);
    stroke(prev, next, C.White, z + 0.01);
    prev = next;
  }
  const dive = h.strike * 0.12;
  taper(at(hx - 0.03, hy), at(hx + 0.02, hy - dive * 0.3), 0.03, 0.032, C.White);
  stroke(at(hx, hy + 0.01), at(hx - 0.13, hy + 0.02 - dive), C.Black);
  stroke(at(hx + 0.03, hy), at(hx + 0.17, hy - 0.015 - dive), C.Beak);
  const eye = at(hx + 0.005, hy + 0.005);
  grid.putPx(eye[0], eye[1], DOT, tone(C.Black, alpha), z + 0.03);
}

function drawFlyer(grid: Grid, b: Flyer, z: number) {
  const { x, y, size: s, facing: f } = b;
  const at = (dx: number, dy: number): [number, number] => [x + f * dx * s, y - dy * s];
  const flap = Math.sin(b.phase);
  const grey = tone(C.Grey, 0.9);
  const [tx, ty] = at(-0.2, 0);
  const [cx, cy] = at(0.12, 0.02);
  grid.taper(tx, ty, cx, cy, s * 0.04, s * 0.055, BODY_RAMP, grey, z);
  const [hx, hy] = at(0.22, 0.05);
  grid.line(cx, cy, hx, hy, tone(C.White, 0.9), z + 0.01);
  const [bx, by] = at(0.36, 0.035);
  grid.line(hx, hy, bx, by, tone(C.Beak, 0.9), z + 0.01);
  const [lx, ly] = at(-0.18, -0.01);
  const [fx, fy] = at(-0.52, -0.04);
  grid.line(lx, ly, fx, fy, tone(C.Beak, 0.7), z);

  const [sx, sy] = at(0.02, 0.03);
  const [ex, ey] = at(-0.08, 0.03 + 0.3 * flap);
  const [wx, wy] = at(-0.3, 0.05 + 0.32 * flap - 0.06 * Math.abs(flap));
  grid.taper(sx, sy, ex, ey, s * 0.05, s * 0.04, BODY_RAMP, grey, z + 0.02);
  grid.taper(ex, ey, wx, wy, s * 0.04, s * 0.015, BODY_RAMP, tone(C.Black, 0.9), z + 0.02);
}

function drawSky(grid: Grid, world: World) {
  const { width, height, time } = world;
  const water = waterLine(world);
  const moonX = width * 0.72;
  const moonY = height * 0.16;
  const moonR = Math.min(width, height) * 0.13;
  const waterRow = Math.floor(water / grid.cellH);

  for (let row = 0; row < waterRow; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const x = (col + 0.5) * grid.cellW;
      const y = (row + 0.5) * grid.cellH;
      const q = Math.hypot(x - moonX, y - moonY) / moonR;
      if (q <= 1) {
        const a = Math.atan2(y - moonY, x - moonX);
        const n = noise(col * 0.45, row * 0.45);
        const ch = q > 0.86 ? lineGlyph(-Math.sin(a), Math.cos(a)) : n > 0.62 ? O : n > 0.45 ? COLON : DOT;
        grid.put(col, row, ch, tone(C.Moon, q > 0.86 ? 0.9 : 0.6), 0.3);
      } else if (cellHash(col, row) > 0.988) {
        const twinkle = 0.3 + 0.5 * noise(col * 3.1, time * 0.8 + row);
        grid.put(col, row, twinkle > 0.6 ? STAR : DOT, tone(C.Star, twinkle), 0);
      }
    }
  }

  // The moon's broken reflection, then the water itself.
  for (let row = waterRow; row < grid.rows; row++) {
    const y = (row + 0.5) * grid.cellH;
    const depth = (y - water) / (height - water);
    const span = moonR * (0.9 - depth * 0.6) * (0.5 + 0.5 * noise(row * 0.6, time * 0.7));
    const shift = Math.sin(row * 0.8 + time * 1.4) * grid.cellW;
    for (let col = 0; col < grid.cols; col++) {
      const x = (col + 0.5) * grid.cellW;
      if (Math.abs(x - moonX - shift) < span) {
        grid.put(col, row, depth < 0.4 ? EQUALS : DASH, tone(C.Moon, 0.5 * (1 - depth)), 0.2);
        continue;
      }
      const n = noise(col * 0.12 + time * 0.25, row * 0.6 - time * 0.06);
      if (row === waterRow && n > 0.35) grid.put(col, row, DASH, tone(C.Water, 0.35), 0);
      else if (n > 0.78) grid.put(col, row, n > 0.86 ? TILDE : DASH, tone(C.Water, (n - 0.7) * 2.5), 0);
    }
  }
}

function drawReed(grid: Grid, r: Reed, world: World) {
  const base = world.height + 8;
  const top = waterLine(world) - r.height;
  const sway = Math.sin(world.time * 0.9 + r.seed) * 10 + noise(r.seed, world.time * 0.3) * 8;
  let prev: [number, number] = [r.x, base];
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    const next: [number, number] = [r.x + (sway + r.lean) * t * t, lerp(base, top, t)];
    grid.line(prev[0], prev[1], next[0], next[1], tone(C.Reed, 0.85), 1.2);
    prev = next;
  }
  if (r.cattail) {
    const [x, y] = prev;
    grid.line(x, y + grid.cellH * 0.5, x, y + grid.cellH * 2.2, tone(C.Cattail, 0.9), 1.3, HASH);
  }
}

function spawnWader(world: World, x: number): Wader {
  return {
    x,
    facing: Math.random() < 0.5 ? 1 : -1,
    size: clamp(world.height * 0.26, 120, 230),
    pose: 0,
    poseTarget: 0.3,
    strike: 0,
    striking: false,
    targetX: null,
    step: 0,
    timer: rand(2, 6),
  };
}

function updateWader(h: Wader, dt: number, world: World) {
  h.timer -= dt;
  if (h.striking) {
    h.strike = Math.min(1, h.strike + dt * 5);
    if (h.strike === 1) {
      h.striking = false;
      world.ripple(h.x + h.facing * h.size * 0.46, waterLine(world) + h.size * 0.04, 50);
    }
  } else {
    h.strike = Math.max(0, h.strike - dt * 1.4);
  }
  h.pose += (h.poseTarget - h.pose) * Math.min(1, dt * 2);

  if (h.targetX !== null) {
    const dx = h.targetX - h.x;
    if (Math.abs(dx) < h.size * 0.4) {
      h.targetX = null;
      h.striking = true;
      h.timer = rand(3, 6);
    } else {
      h.facing = dx > 0 ? 1 : -1;
      h.x += h.facing * h.size * 0.14 * dt;
      h.step += dt * 3;
      h.poseTarget = 0.8;
    }
    return;
  }
  if (h.timer > 0) return;
  // Wait, look up, wade a few steps, sometimes stab at a fish.
  const roll = Math.random();
  if (roll < 0.35) h.poseTarget = h.poseTarget > 0.5 ? 0.2 : 1;
  else if (roll < 0.75) h.targetX = clamp(h.x + rand(-1, 1) * h.size, h.size * 0.4, world.width - h.size * 0.4);
  else h.striking = true;
  h.timer = rand(3, 8);
}

export const herons: SceneSpec = {
  colors: ['#3f5d8c', '#e6dcc0', '#8e9bb3', '#e3e8ef', '#4a5168', '#d7a54a', '#4f6b5a', '#8899bb', '#8a6a4a'],
  create(world) {
    const waders = world.width > 900
      ? [spawnWader(world, world.width * 0.3), spawnWader(world, world.width * 0.62)]
      : [spawnWader(world, world.width * 0.42)];
    const reeds: Reed[] = [];
    for (const [from, to] of [[-0.02, 0.16], [0.84, 1.02]]) {
      const n = Math.round(world.width / 140) + 3;
      for (let i = 0; i < n; i++) {
        reeds.push({
          x: world.width * rand(from, to),
          height: world.height * rand(0.04, 0.3),
          lean: rand(-14, 14),
          seed: rand(0, 1000),
          cattail: Math.random() < 0.3,
        });
      }
    }
    let flyer: Flyer | null = null;
    let nextFlyer = rand(2, 8);

    return {
      update(dt, w) {
        for (const h of waders) updateWader(h, dt, w);
        if (flyer) {
          flyer.x += flyer.facing * flyer.size * 0.55 * dt;
          flyer.phase += dt * 3.2;
          if (flyer.x < -flyer.size * 2 || flyer.x > w.width + flyer.size * 2) flyer = null;
        } else if ((nextFlyer -= dt) < 0) {
          const facing = Math.random() < 0.5 ? 1 : -1;
          const size = clamp(w.height * 0.2, 90, 180);
          flyer = { x: facing === 1 ? -size : w.width + size, y: rand(0.1, 0.35) * w.height, facing, size, phase: 0 };
          nextFlyer = rand(10, 22);
        }
      },
      draw(grid, w) {
        drawSky(grid, w);
        const water = waterLine(w);
        const ground = water + 8;
        for (const h of waders) {
          drawWader(grid, h, ground, (x, y) => [x, y], 1, 1, 3);
          drawWader(
            grid,
            h,
            ground,
            (x, y) => [x + Math.sin(y * 0.09 + w.time * 2) * 3, ground + (ground - y) * 0.55],
            0.28,
            0.6,
            0.6,
          );
        }
        if (flyer) drawFlyer(grid, flyer, 4);
        for (const r of reeds) drawReed(grid, r, w);
      },
      poke(x, y, w) {
        if (y < waterLine(w)) return;
        let nearest = waders[0];
        for (const h of waders) if (Math.abs(h.x - x) < Math.abs(nearest.x - x)) nearest = h;
        nearest.targetX = clamp(x - Math.sign(x - nearest.x) * nearest.size * 0.3, 0, w.width);
      },
    };
  },
};

