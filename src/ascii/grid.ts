import { clamp } from './math';

/** Each color role comes in this many opacity steps, so things can fade. */
export const LEVELS = 4;

/** Index into the palette for a role at a given opacity (0 to 1). */
export function tone(role: number, alpha = 1): number {
  return role * LEVELS + clamp(Math.ceil(alpha * LEVELS) - 1, 0, LEVELS - 1);
}

const code = (ch: string) => ch.charCodeAt(0);

/**
 * Picks the glyph that follows a stroke going in direction (dx, dy), in screen
 * pixels with y pointing down. Strokes made of these read as real lines.
 */
export function lineGlyph(dx: number, dy: number): number {
  let a = Math.atan2(dy, dx);
  if (a < 0) a += Math.PI;
  const step = Math.PI / 8;
  if (a < step || a >= 7 * step) return code('-');
  if (a < 3 * step) return code('\\');
  if (a < 5 * step) return code('|');
  return code('/');
}

/** Ramps go from sparse to dense. */
export function rampChar(ramp: string, v: number): number {
  return ramp.charCodeAt(clamp(Math.floor(v * ramp.length), 0, ramp.length - 1));
}

/**
 * The character frame being composed. Every write carries a depth, and the
 * highest depth wins a cell, so scenes can draw in any order.
 */
export class Grid {
  cols = 0;
  rows = 0;
  cellW = 9;
  cellH = 14;
  chars = new Uint16Array(0);
  colors = new Uint8Array(0);
  depth = new Float32Array(0);

  resize(width: number, height: number, cellW: number, cellH: number) {
    this.cellW = cellW;
    this.cellH = cellH;
    this.cols = Math.ceil(width / cellW);
    this.rows = Math.ceil(height / cellH);
    const size = this.cols * this.rows;
    this.chars = new Uint16Array(size);
    this.colors = new Uint8Array(size);
    this.depth = new Float32Array(size);
  }

  clear() {
    this.chars.fill(0);
    this.depth.fill(-Infinity);
  }

  put(col: number, row: number, ch: number, color: number, z: number) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return;
    const i = row * this.cols + col;
    if (z < this.depth[i]) return;
    this.depth[i] = z;
    this.chars[i] = ch;
    this.colors[i] = color;
  }

  /** Writes only where nothing sits yet, for shadows and backdrops. */
  under(col: number, row: number, ch: number, color: number, z: number) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return;
    if (this.chars[row * this.cols + col] === 0) this.put(col, row, ch, color, z);
  }

  putPx(x: number, y: number, ch: number, color: number, z: number) {
    this.put(Math.floor(x / this.cellW), Math.floor(y / this.cellH), ch, color, z);
  }

  /** Calls `fn` with the pixel center of every cell overlapping the box. */
  cells(x0: number, y0: number, x1: number, y1: number, fn: (col: number, row: number, x: number, y: number) => void) {
    const c0 = Math.max(0, Math.floor(x0 / this.cellW));
    const c1 = Math.min(this.cols - 1, Math.floor(x1 / this.cellW));
    const r0 = Math.max(0, Math.floor(y0 / this.cellH));
    const r1 = Math.min(this.rows - 1, Math.floor(y1 / this.cellH));
    for (let row = r0; row <= r1; row++) {
      const y = (row + 0.5) * this.cellH;
      for (let col = c0; col <= c1; col++) fn(col, row, (col + 0.5) * this.cellW, y);
    }
  }

  /** A one-cell stroke whose glyphs follow its direction, unless `ch` forces one. */
  line(ax: number, ay: number, bx: number, by: number, color: number, z: number, ch?: number) {
    const dx = bx - ax;
    const dy = by - ay;
    const glyph = ch ?? lineGlyph(dx, dy);
    const steps = Math.max(1, Math.ceil(Math.hypot(dx / this.cellW, dy / this.cellH) * 1.5));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.putPx(ax + dx * t, ay + dy * t, glyph, color, z);
    }
  }

  /**
   * A segment with a radius that goes from r0 to r1, shaded with `ramp` from
   * its rim (sparse) to its core (dense). Most bodies are built from these.
   */
  taper(ax: number, ay: number, bx: number, by: number, r0: number, r1: number, ramp: string, color: number, z: number) {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1;
    const r = Math.max(r0, r1);
    this.cells(Math.min(ax, bx) - r, Math.min(ay, by) - r, Math.max(ax, bx) + r, Math.max(ay, by) + r, (col, row, x, y) => {
      const t = clamp(((x - ax) * dx + (y - ay) * dy) / len2, 0, 1);
      const radius = r0 + (r1 - r0) * t;
      const d = Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
      if (d <= radius) this.put(col, row, rampChar(ramp, 1 - d / (radius + 0.001)), color, z);
    });
  }

  /** Text laid on the grid. Wide (CJK) characters take two cells. */
  text(x: number, y: number, str: string, color: number, z: number, wide = false) {
    const col = Math.floor(x / this.cellW);
    const row = Math.floor(y / this.cellH);
    [...str].forEach((ch, i) => this.put(col + i * (wide ? 2 : 1), row, code(ch), color, z));
  }

  /**
   * A small hand-drawn sprite centered on (x, y). `mask` has one character per
   * glyph naming its color in `palette`; spaces in `lines` stay transparent.
   */
  sprite(x: number, y: number, lines: string[], mask: string[], palette: Record<string, number>, z: number) {
    const width = Math.max(...lines.map((l) => l.length));
    const col0 = Math.round(x / this.cellW - width / 2);
    const row0 = Math.round(y / this.cellH - lines.length / 2);
    lines.forEach((line, r) => {
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch === ' ') continue;
        const color = palette[mask[r]?.[c] ?? ''] ?? palette.default;
        if (color !== undefined) this.put(col0 + c, row0 + r, code(ch), color, z);
      }
    });
  }
}
