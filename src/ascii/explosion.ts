import { metrics, paintGrid, toPalette } from './engine';
import { Grid, lineGlyph, rampChar, tone } from './grid';
import { TAU, rand } from './math';

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  role: number;
  /** A coin glyph flying whole, instead of a streak burning down. */
  coin?: number;
}

const SPARKS = 72;
/** How long the cloud and the shock ring last, in seconds. */
const BLAST = 0.5;
/** Sparse to dense: a spark burns down this ramp, the cloud thickens toward its core. */
const EMBER = ".'+*#@";
const CLOUD = '.:;*#@';
const COINS = ['$', '€', '¥'].map((ch) => ch.charCodeAt(0));

/**
 * An ASCII blast at (x, y), in screen pixels: a cloud of glyphs, a shock ring, then sparks and
 * coins flying out and crackling away. Calls `onEnd` once the last spark is out and returns a
 * function that stops it early.
 */
export function explosion(canvas: HTMLCanvasElement, colors: string[], x: number, y: number, onEnd: () => void): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    onEnd();
    return () => {};
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const { cellW, cellH, font } = metrics(width);
  const grid = new Grid();
  grid.resize(width, height, cellW, cellH);
  const palette = toPalette(colors);

  let sparks: Spark[] = Array.from({ length: SPARKS }, (_, i) => {
    const a = (i / SPARKS) * TAU + rand(-0.15, 0.15);
    const v = rand(120, 440);
    return {
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      age: 0,
      life: rand(0.8, 1.6),
      role: i % colors.length,
      coin: i % 6 === 0 ? COINS[(i / 6) % COINS.length] : undefined,
    };
  });
  let age = 0;

  const step = (dt: number) => {
    age += dt;
    const drag = Math.exp(-2.2 * dt);
    for (const s of sparks) {
      s.age += dt;
      s.vx *= drag;
      s.vy = s.vy * drag + 160 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    sparks = sparks.filter((s) => s.age < s.life);
  };

  const draw = () => {
    grid.clear();
    if (age < BLAST) {
      const t = age / BLAST;
      const cloud = cellW * (1.5 + t * 6);
      grid.taper(x, y, x, y, cloud, cloud, CLOUD, tone(0, 1 - t), 1);
      // The shock ring: glyphs drawn along the circle, each following its tangent.
      const ring = cellW * 3 + t * 180;
      const count = Math.ceil((TAU * ring) / (cellW * 0.9));
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU;
        grid.putPx(x + Math.cos(a) * ring, y + Math.sin(a) * ring, lineGlyph(-Math.sin(a), Math.cos(a)), tone(1, 0.9 - t), 2);
      }
    }
    for (const s of sparks) {
      const t = s.age / s.life;
      if (s.coin !== undefined) grid.putPx(s.x, s.y, s.coin, tone(s.role, 1.2 - t), 4);
      // Fresh sparks are streaks pointing away from the blast.
      else if (t < 0.2) grid.line(s.x - s.vx * 0.04, s.y - s.vy * 0.04, s.x, s.y, tone(s.role), 3);
      // Old ones crackle: they skip frames at random as they die.
      else if (t < 0.65 || Math.random() > 0.35) grid.putPx(s.x, s.y, rampChar(EMBER, 1 - t), tone(s.role, 1.15 - t), 3);
    }
    paintGrid(ctx, grid, palette, font, dpr);
  };

  let raf = 0;
  let last = performance.now();
  const frame = (now: number) => {
    // Steps are capped, so a slow phone plays it slower rather than skipping it.
    step(Math.min((now - last) / 1000, 0.05));
    last = now;
    draw();
    if (age >= BLAST && sparks.length === 0) {
      ctx.clearRect(0, 0, width, height);
      onEnd();
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
