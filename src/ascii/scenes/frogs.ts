import type { SceneSpec, World } from '../engine';
import { type Grid, lineGlyph, tone } from '../grid';
import { TAU, angleDelta, clamp, noise, pick, rand } from '../math';
import { drawWater } from './water';

const C = { Water: 0, Pad: 1, Vein: 2, Frog: 3, Eye: 4, Lotus: 5, Firefly: 6, Voice: 7, Belly: 8 } as const;

const DASH = '-'.charCodeAt(0);
const EQUALS = '='.charCodeAt(0);
const COLON = ':'.charCodeAt(0);
const DOT = '.'.charCodeAt(0);
const STAR = '*'.charCodeAt(0);
const PLUS = '+'.charCodeAt(0);

/** Hand-drawn frog frames. Mask letters: f body, e eyes, b throat. */
const FROG = {
  sit: { lines: [' (o)(o) ', '(  ~~  )', ' ^^  ^^ '], mask: [' ffeeff ', 'ff bb ff', ' ff  ff '] },
  blink: { lines: [' (-)(-) ', '(  ~~  )', ' ^^  ^^ '], mask: [' ffeeff ', 'ff bb ff', ' ff  ff '] },
  croak: { lines: [' (o)(o) ', '( (()) )', ' ^^  ^^ '], mask: [' ffeeff ', 'f bbbb f', ' ff  ff '] },
  jump: { lines: [' (o)(o) ', ' (    ) ', '/      \\'], mask: [' ffeeff ', ' ffffff ', 'ff    ff'] },
};
const LOTUS = { lines: [' \\|/ ', '(o*o)'], mask: [' lll ', 'llell'] };

interface Pad {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  notch: number;
  seed: number;
  bob: number;
  lotus: boolean;
}

interface Frog {
  pad: Pad;
  /** Offset from the pad center, so the frog rides its drifting pad. */
  ox: number;
  oy: number;
  jump: { from: [number, number]; to: Pad; t: number; length: number } | null;
  croak: number;
  blink: number;
  timer: number;
}

interface Voice {
  x: number;
  y: number;
  age: number;
}

interface Firefly {
  x: number;
  y: number;
  seed: number;
}

function drawPad(grid: Grid, p: Pad, z: number) {
  const r = p.r * (1 + Math.sin(p.bob * 12) * p.bob * 0.08);
  grid.cells(p.x - r, p.y - r, p.x + r, p.y + r, (col, row, x, y) => {
    const dx = x - p.x;
    const dy = y - p.y;
    const q = Math.hypot(dx, dy) / r;
    if (q > 1) return;
    const a = Math.atan2(dy, dx);
    // The notch every lily pad has, from the rim to the center.
    if (q > 0.12 && Math.abs(angleDelta(a, p.notch)) < 0.32) return;
    if (q > 0.82) {
      grid.put(col, row, lineGlyph(-Math.sin(a), Math.cos(a)), tone(C.Pad, 0.95), z);
    } else if (Math.abs(Math.sin((a - p.notch) * 3.5)) < 0.16 && q > 0.18) {
      grid.put(col, row, lineGlyph(dx, dy), tone(C.Vein, 0.9), z);
    } else {
      const n = noise(col * 0.8 + p.seed, row * 0.8);
      grid.put(col, row, n > 0.6 ? EQUALS : n > 0.35 ? DASH : COLON, tone(C.Pad, 0.55), z);
    }
  });
}

function frogPosition(f: Frog): [number, number] {
  if (!f.jump) return [f.pad.x + f.ox, f.pad.y + f.oy];
  const { from, to, t, length } = f.jump;
  const x = from[0] + (to.x - from[0]) * t;
  const y = from[1] + (to.y - from[1]) * t;
  // Seen from above at a slant, a hop reads as rising on screen.
  return [x, y - Math.sin(t * Math.PI) * (30 + length * 0.25)];
}

export const frogs: SceneSpec = {
  colors: ['#4a6a9a', '#4f9a62', '#2f6a44', '#86d070', '#e8d36a', '#e7a3b8', '#d8f07a', '#bcd6a8', '#d8e8b0'],
  create(world) {
    const padCount = clamp(Math.round((world.width * world.height) / 42000), 6, 16);
    const pads: Pad[] = Array.from({ length: padCount }, () => ({
      x: rand(0, world.width),
      y: rand(0, world.height),
      vx: 0,
      vy: 0,
      r: clamp(Math.min(world.width, world.height) * 0.11, 40, 72) * rand(0.75, 1.2),
      notch: rand(0, TAU),
      seed: rand(0, 1000),
      bob: 0,
      lotus: Math.random() < 0.3,
    }));
    const frogCount = clamp(Math.round((world.width * world.height) / 140000), 2, 5);
    const frogs: Frog[] = pads.slice(0, frogCount).map((pad) => ({
      pad,
      ox: rand(-0.2, 0.2) * pad.r,
      oy: rand(-0.2, 0.2) * pad.r,
      jump: null,
      croak: 0,
      blink: 0,
      timer: rand(1, 5),
    }));
    const voices: Voice[] = [];
    const fireflies: Firefly[] = Array.from({ length: clamp(Math.round(world.width / 40), 8, 30) }, () => ({
      x: rand(0, world.width),
      y: rand(0, world.height),
      seed: rand(0, 1000),
    }));

    const hop = (f: Frog, w: World) => {
      if (f.jump) return;
      const [x, y] = frogPosition(f);
      const taken = new Set(frogs.map((o) => o.jump?.to ?? o.pad));
      const options = pads.filter((p) => !taken.has(p) && Math.hypot(p.x - x, p.y - y) < 320);
      if (options.length === 0) return;
      const to = pick(options);
      f.jump = { from: [x, y], to, t: 0, length: Math.hypot(to.x - x, to.y - y) };
      w.ripple(x, y, 30);
    };

    return {
      update(dt, w) {
        for (const p of pads) {
          p.vx += (noise(p.seed, w.time * 0.05) - 0.5) * 8 * dt;
          p.vy += (noise(p.seed + 50, w.time * 0.05) - 0.5) * 8 * dt;
          // Keep pads apart and on screen.
          for (const o of pads) {
            if (o === p) continue;
            const dx = p.x - o.x;
            const dy = p.y - o.y;
            const d = Math.hypot(dx, dy) || 1;
            const gap = p.r + o.r + 8;
            if (d < gap) {
              p.vx += (dx / d) * (gap - d) * dt * 2;
              p.vy += (dy / d) * (gap - d) * dt * 2;
            }
          }
          if (p.x < p.r * 0.3) p.vx += 10 * dt;
          if (p.x > w.width - p.r * 0.3) p.vx -= 10 * dt;
          if (p.y < p.r * 0.3) p.vy += 10 * dt;
          if (p.y > w.height - p.r * 0.3) p.vy -= 10 * dt;
          const drag = 1 - Math.min(1, dt * 0.8);
          p.vx *= drag;
          p.vy *= drag;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.bob = Math.max(0, p.bob - dt * 1.2);
        }

        for (const f of frogs) {
          f.croak = Math.max(0, f.croak - dt);
          f.blink = Math.max(0, f.blink - dt);
          if (f.jump) {
            f.jump.t += dt / 0.7;
            if (f.jump.t >= 1) {
              f.pad = f.jump.to;
              f.ox = rand(-0.15, 0.15) * f.pad.r;
              f.oy = rand(-0.15, 0.15) * f.pad.r;
              f.pad.bob = 1;
              f.jump = null;
              w.ripple(f.pad.x, f.pad.y, f.pad.r * 1.6);
            }
            continue;
          }
          if ((f.timer -= dt) > 0) continue;
          const roll = Math.random();
          if (roll < 0.4) {
            f.croak = 0.9;
            const [x, y] = frogPosition(f);
            voices.push({ x: x + rand(-10, 10), y: y - 28, age: 0 });
          } else if (roll < 0.7) {
            f.blink = 0.18;
          } else {
            hop(f, w);
          }
          f.timer = rand(2, 7);
        }

        for (const v of voices) {
          v.age += dt;
          v.y -= 14 * dt;
        }
        for (let i = voices.length - 1; i >= 0; i--) if (voices[i].age > 1.8) voices.splice(i, 1);
        for (const ff of fireflies) {
          ff.x += (noise(ff.seed, w.time * 0.2) - 0.5) * 30 * dt;
          ff.y += (noise(ff.seed + 9, w.time * 0.2) - 0.5) * 30 * dt;
          ff.x = (ff.x + w.width) % w.width;
          ff.y = (ff.y + w.height) % w.height;
        }
      },
      draw(grid, w) {
        drawWater(grid, w, C.Water);
        pads.forEach((p, i) => {
          drawPad(grid, p, 1 + i * 0.01);
          if (p.lotus) {
            const a = p.notch + Math.PI;
            grid.sprite(p.x + Math.cos(a) * p.r * 0.45, p.y + Math.sin(a) * p.r * 0.45, LOTUS.lines, LOTUS.mask, { l: tone(C.Lotus, 0.9), e: tone(C.Eye, 1) }, 1.5);
          }
        });
        const colors = { f: tone(C.Frog, 1), e: tone(C.Eye, 1), b: tone(C.Belly, 0.9) };
        for (const f of frogs) {
          const [x, y] = frogPosition(f);
          const frame = f.jump ? FROG.jump : f.croak > 0 ? FROG.croak : f.blink > 0 ? FROG.blink : FROG.sit;
          if (f.jump) {
            const sx = f.jump.from[0] + (f.jump.to.x - f.jump.from[0]) * f.jump.t;
            const sy = f.jump.from[1] + (f.jump.to.y - f.jump.from[1]) * f.jump.t;
            grid.line(sx - 12, sy, sx + 12, sy, tone(C.Water, 0.6), 0.8, DOT);
          }
          grid.sprite(x, y, frame.lines, frame.mask, colors, f.jump ? 6 : 3);
        }
        for (const v of voices) grid.text(v.x, v.y, 'ケロ', tone(C.Voice, 1 - v.age / 1.8), 5, true);
        for (const ff of fireflies) {
          const glow = (Math.sin(w.time * 1.7 + ff.seed) + 1) / 2;
          if (glow < 0.35) continue;
          grid.putPx(ff.x, ff.y, glow > 0.85 ? STAR : glow > 0.6 ? PLUS : DOT, tone(C.Firefly, glow), 7);
        }
      },
      poke(x, y, w) {
        for (const p of pads) {
          const dx = p.x - x;
          const dy = p.y - y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 170) {
            p.vx += (dx / d) * 40;
            p.vy += (dy / d) * 40;
          }
        }
        for (const f of frogs) {
          const [fx, fy] = frogPosition(f);
          if (Math.hypot(fx - x, fy - y) < 160) hop(f, w);
        }
      },
    };
  },
};
