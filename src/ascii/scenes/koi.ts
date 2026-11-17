import type { SceneSpec, World } from '../engine';
import { type Grid, rampChar, tone } from '../grid';
import { TAU, clamp, lerp, noise, pick, rand, turnToward } from '../math';
import { drawWater } from './water';

const C = { Water: 0, White: 1, Red: 2, Black: 3, Gold: 4, Fin: 5, Food: 6 } as const;

const NODES = 16;
const RAMP = '.:=+*#%@';
const VARIETIES = ['kohaku', 'kohaku', 'sanke', 'tancho', 'showa', 'ogon'] as const;
type Variety = (typeof VARIETIES)[number];

interface Point {
  x: number;
  y: number;
}

interface Koi {
  spine: Point[];
  heading: number;
  wander: number;
  speed: number;
  cruise: number;
  length: number;
  halfWidth: number;
  phase: number;
  seed: number;
  variety: Variety;
  /** Deeper fish are fainter and pass under shallower ones. */
  depth: number;
}

interface Pellet {
  x: number;
  y: number;
  age: number;
}

const PELLET_LIFE = 12;
const O = 'o'.charCodeAt(0);
const DOT = '.'.charCodeAt(0);
const COLON = ':'.charCodeAt(0);

/** Half-width along the body, from snout (0) to tail (1), as a share of the widest point. */
function bodyWidth(s: number): number {
  if (s < 0.12) return 0.55 + 0.45 * Math.sin((s / 0.12) * (Math.PI / 2));
  return Math.max(0.1, 1 - ((s - 0.12) / 0.88) ** 1.3 * 0.92);
}

function spawn(world: World): Koi {
  const length = clamp(Math.min(world.width, world.height) * 0.42, 130, 230) * rand(0.75, 1.1);
  const heading = rand(0, TAU);
  const x = rand(0, world.width);
  const y = rand(0, world.height);
  const step = length / (NODES - 1);
  return {
    spine: Array.from({ length: NODES }, (_, i) => ({
      x: x - Math.cos(heading) * step * i,
      y: y - Math.sin(heading) * step * i,
    })),
    heading,
    wander: heading,
    speed: 30,
    cruise: rand(24, 40),
    length,
    halfWidth: length * 0.13,
    phase: rand(0, TAU),
    seed: rand(0, 1000),
    variety: pick(VARIETIES),
    depth: rand(0.55, 1),
  };
}

function patternColor(k: Koi, s: number, across: number): number {
  const a = noise(s * 5 + k.seed, across * 1.4 + k.seed * 0.7);
  const b = noise(s * 9 - k.seed, across * 2.5 + 40);
  switch (k.variety) {
    case 'kohaku':
      return a > 0.55 && s < 0.85 ? C.Red : C.White;
    case 'sanke':
      if (b > 0.8) return C.Black;
      return a > 0.58 && s < 0.85 ? C.Red : C.White;
    case 'tancho':
      return s < 0.15 && Math.abs(across) < 0.7 ? C.Red : C.White;
    case 'showa':
      if (a > 0.56) return C.Red;
      return b > 0.66 ? C.White : C.Black;
    case 'ogon':
      return C.Gold;
  }
}

function steer(k: Koi, dt: number, world: World, pellets: Pellet[]) {
  const head = k.spine[0];
  const { width, height, pointer } = world;
  k.wander += (noise(k.seed, world.time * 0.3) - 0.5) * dt * 3;
  let desired = k.wander;
  let target = k.cruise;
  let agility = 1.4;

  let food: Pellet | undefined;
  let best = 320 ** 2;
  for (const p of pellets) {
    const d = (p.x - head.x) ** 2 + (p.y - head.y) ** 2;
    if (d < best) {
      best = d;
      food = p;
    }
  }

  const reach = k.length * 0.1;
  const outside =
    head.x < -reach || head.x > width + reach || head.y < -reach || head.y > height + reach;
  if (outside) {
    desired = Math.atan2(height / 2 - head.y, width / 2 - head.x);
  } else if (food) {
    desired = Math.atan2(food.y - head.y, food.x - head.x);
    target = k.cruise * 2.4;
    agility = 3.2;
  } else if (pointer.active) {
    const dx = pointer.x - head.x;
    const dy = pointer.y - head.y;
    const d = Math.hypot(dx, dy);
    if (d < 280) {
      // Swim up to the finger, then circle it instead of bumping into it.
      desired = Math.atan2(dy, dx) + (d < 90 ? 1.2 : 0.2);
      target = k.cruise * 1.5;
      agility = 2.4;
    }
  }
  if (desired !== k.wander) k.wander = k.heading;

  k.heading = turnToward(k.heading, desired, agility * dt);
  k.speed = lerp(k.speed, target, dt * 1.5);
  k.phase += dt * (2.2 + k.speed / 18);

  const swim = k.heading + Math.sin(k.phase) * 0.32;
  head.x += Math.cos(swim) * k.speed * dt;
  head.y += Math.sin(swim) * k.speed * dt;

  const step = k.length / (NODES - 1);
  for (let i = 1; i < NODES; i++) {
    const prev = k.spine[i - 1];
    const p = k.spine[i];
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    const d = Math.hypot(dx, dy) || 1;
    p.x = prev.x + (dx / d) * step;
    p.y = prev.y + (dy / d) * step;
  }

  if (food && best < 14 ** 2) {
    pellets.splice(pellets.indexOf(food), 1);
    world.ripple(head.x, head.y, 34);
  }
}

function drawKoi(grid: Grid, k: Koi, z: number) {
  const { spine, halfWidth, depth } = k;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of spine) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  const pad = halfWidth * 1.2;

  grid.cells(x0 - pad, y0 - pad, x1 + pad, y1 + pad, (col, row, x, y) => {
    let best = Infinity;
    let s = 0;
    let side = 1;
    for (let i = 0; i < NODES - 1; i++) {
      const a = spine[i];
      const b = spine[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      const d2 = (x - a.x - dx * t) ** 2 + (y - a.y - dy * t) ** 2;
      if (d2 < best) {
        best = d2;
        s = (i + t) / (NODES - 1);
        side = dx * (y - a.y) - dy * (x - a.x) > 0 ? 1 : -1;
      }
    }
    const w = bodyWidth(s) * halfWidth;
    const d = Math.sqrt(best);
    if (d > w) return;
    const u = d / w;
    const color = patternColor(k, s, side * u);
        const shade = (1 - u) ** 0.7 * 0.85 + noise(col * 0.9, row * 0.9 + k.seed) * 0.15;
    grid.put(col, row, rampChar(RAMP, shade), tone(color, depth), z);
    grid.under(col + 1, row + 1, COLON, tone(C.Water, 0.3), 0.5);
  });

  // Fins are strokes, which read lighter than the body.
  const fin = tone(C.Fin, depth * 0.75);
  const flap = Math.sin(k.phase * 0.8);
  const tailBase = spine[NODES - 1];
  const prev = spine[NODES - 3];
  const back = Math.atan2(tailBase.y - prev.y, tailBase.x - prev.x) + Math.sin(k.phase - 1.4) * 0.45;
  const tailLength = k.length * 0.2;
  for (const spread of [-0.5, -0.22, 0.22, 0.5]) {
    const a = back + spread;
    grid.line(tailBase.x, tailBase.y, tailBase.x + Math.cos(a) * tailLength, tailBase.y + Math.sin(a) * tailLength, fin, z - 0.01);
  }

  const shoulder = spine[3];
  const neck = spine[2];
  const along = Math.atan2(shoulder.y - neck.y, shoulder.x - neck.x);
  for (const side of [-1, 1]) {
    const a = along + side * (1.05 + flap * 0.3);
    const rootX = shoulder.x + Math.cos(along + side * Math.PI / 2) * halfWidth * 0.8;
    const rootY = shoulder.y + Math.sin(along + side * Math.PI / 2) * halfWidth * 0.8;
    const reach = halfWidth * 1.3;
    grid.line(rootX, rootY, rootX + Math.cos(a) * reach, rootY + Math.sin(a) * reach, fin, z - 0.01);
  }

  const eyeBase = spine[1];
  const eyeAlong = Math.atan2(spine[0].y - eyeBase.y, spine[0].x - eyeBase.x);
  for (const side of [-1, 1]) {
    const a = eyeAlong + side * (Math.PI / 2);
    grid.putPx(eyeBase.x + Math.cos(a) * halfWidth * 0.5, eyeBase.y + Math.sin(a) * halfWidth * 0.5, O, tone(C.Black, 1), z + 0.01);
  }
}

export const koi: SceneSpec = {
  colors: ['#4a6a9a', '#ece4da', '#e8604a', '#6a6880', '#e0b252', '#b9c6d8', '#ecaa5c'],
  create(world) {
    const count = clamp(Math.round((world.width * world.height) / 80000), 4, 8);
    const fish = Array.from({ length: count }, () => spawn(world)).sort((a, b) => a.depth - b.depth);
    const pellets: Pellet[] = [];

    return {
      update(dt, w) {
        for (const p of pellets) p.age += dt;
        for (let i = pellets.length - 1; i >= 0; i--) if (pellets[i].age > PELLET_LIFE) pellets.splice(i, 1);
        for (const k of fish) steer(k, dt, w, pellets);
      },
      draw(grid, w) {
        drawWater(grid, w, C.Water);
        fish.forEach((k, i) => drawKoi(grid, k, 2 + i));
        for (const p of pellets) {
          const fade = 1 - p.age / PELLET_LIFE;
          grid.putPx(p.x, p.y, p.age < 2 ? O : DOT, tone(C.Food, fade), 1.5);
        }
      },
      poke(x, y) {
        const n = Math.round(rand(4, 7));
        for (let i = 0; i < n; i++) pellets.push({ x: x + rand(-26, 26), y: y + rand(-18, 18), age: rand(0, 0.5) });
      },
    };
  },
};
