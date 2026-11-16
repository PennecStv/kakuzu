import { Grid, LEVELS, lineGlyph, tone } from './grid';
import { TAU, clamp } from './math';

export interface Pointer {
  x: number;
  y: number;
  /** True while a mouse hovers the page or a finger touches it. */
  active: boolean;
}

export interface World {
  width: number;
  height: number;
  /** Seconds of simulated time. */
  time: number;
  pointer: Pointer;
  ripple: (x: number, y: number, size?: number) => void;
}

export interface Scene {
  update: (dt: number, world: World) => void;
  draw: (grid: Grid, world: World) => void;
  /** A tap on the background. */
  poke?: (x: number, y: number, world: World) => void;
}

export interface SceneSpec {
  /** Hex colors by role. Role 0 is the ambient tone, also used by ripples. */
  colors: string[];
  create: (world: World) => Scene;
}

interface Ripple {
  x: number;
  y: number;
  age: number;
  life: number;
  size: number;
}

const FRAME_MS = 1000 / 24;
const FONT = '"Geist Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace';
/** Taps on these never reach the scene. */
const INTERACTIVE = 'button, a, input, select, textarea, label, dialog, [data-no-poke]';

function toRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Runs one scene on one canvas: sizing, the frame loop (capped at 24 fps to
 * spare batteries), pointer input, shared ripples and the final glyph pass.
 */
export class AsciiEngine {
  private ctx: CanvasRenderingContext2D;
  private grid = new Grid();
  private palette: string[] = [];
  private scene: Scene;
  private ripples: Ripple[] = [];
  private glyphs = new Map<number, string>();
  private raf = 0;
  private last = 0;
  private dpr = 1;
  private font = '';
  private abort = new AbortController();
  private canvas: HTMLCanvasElement;
  private motion: boolean;
  readonly world: World;

  constructor(canvas: HTMLCanvasElement, spec: SceneSpec, motion: boolean) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    this.canvas = canvas;
    this.ctx = ctx;
    this.motion = motion;
    this.world = {
      width: window.innerWidth,
      height: window.innerHeight,
      time: 0,
      pointer: { x: -1e4, y: -1e4, active: false },
      ripple: (x, y, size = 90) => this.ripples.push({ x, y, size, age: 0, life: 1.6 + size / 120 }),
    };
    this.resize();
    this.scene = this.load(spec);
    this.listen();
    this.sync();
  }

  setScene(spec: SceneSpec) {
    this.scene = this.load(spec);
    if (!this.motion) this.paint();
  }

  setMotion(motion: boolean) {
    this.motion = motion;
    this.sync();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.abort.abort();
  }

  private load(spec: SceneSpec): Scene {
    this.palette = spec.colors.flatMap((hex) =>
      Array.from({ length: LEVELS }, (_, level) => toRgba(hex, (level + 1) / LEVELS)),
    );
    this.ripples = [];
    const scene = spec.create(this.world);
    // Let the scene settle so animals start spread out instead of on their spawn points.
    for (let i = 0; i < 90; i++) this.step(scene, 1 / 30);
    return scene;
  }

  private sync() {
    cancelAnimationFrame(this.raf);
    if (this.motion && !document.hidden) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    } else {
      this.paint();
    }
  }

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const elapsed = now - this.last;
    if (elapsed < FRAME_MS - 2) return;
    this.last = now;
    this.step(this.scene, Math.min(elapsed / 1000, 0.1));
    this.paint();
  };

  private step(scene: Scene, dt: number) {
    this.world.time += dt;
    scene.update(dt, this.world);
    for (const r of this.ripples) r.age += dt;
    this.ripples = this.ripples.filter((r) => r.age < r.life);
  }

  private resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    // Monospace glyphs are about 0.6em wide: a font of 1.6 cells fills the cell edge to edge.
    const cellW = clamp(Math.round(Math.sqrt(width) * 0.4), 8, 11);
    const cellH = Math.round(cellW * 1.6);
    this.grid.resize(width, height, cellW, cellH);
    this.font = `500 ${Math.round(cellW * 1.62)}px ${FONT}`;
    this.world.width = width;
    this.world.height = height;
  }

  private listen() {
    const { signal } = this.abort;
    const pointer = this.world.pointer;
    const move = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = e.pointerType === 'mouse' || e.buttons > 0;
    };
    window.addEventListener('pointermove', move, { signal, passive: true });
    window.addEventListener(
      'pointerdown',
      (e) => {
        move(e);
        pointer.active = true;
        if (!this.motion || (e.target instanceof Element && e.target.closest(INTERACTIVE))) return;
        this.world.ripple(e.clientX, e.clientY);
        this.scene.poke?.(e.clientX, e.clientY, this.world);
      },
      { signal, passive: true },
    );
    const release = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') pointer.active = false;
    };
    window.addEventListener('pointerup', release, { signal, passive: true });
    window.addEventListener('pointercancel', release, { signal, passive: true });
    document.documentElement.addEventListener('pointerleave', () => (pointer.active = false), { signal });
    window.addEventListener(
      'resize',
      () => {
        this.resize();
        if (!this.motion) this.paint();
      },
      { signal },
    );
    document.addEventListener('visibilitychange', () => this.sync(), { signal });
    // The canvas font may arrive after the first frame.
    document.fonts.ready.then(() => !signal.aborted && this.paint());
  }

  private drawRipples() {
    const { grid } = this;
    for (const r of this.ripples) {
      const t = r.age / r.life;
      const fade = 1 - t;
      const rings = [
        [r.size * (1 - (1 - t) ** 3), fade],
        [r.size * 0.62 * (1 - (1 - t) ** 2), fade * 0.5],
      ];
      for (const [radius, alpha] of rings) {
        if (radius < 4) continue;
        const count = Math.max(8, Math.ceil((TAU * radius) / (grid.cellW * 0.9)));
        for (let i = 0; i < count; i++) {
          const a = (i / count) * TAU;
          const x = r.x + Math.cos(a) * radius;
          // Ripples are seen at a slant, a little flatter than wide.
          const y = r.y + Math.sin(a) * radius * 0.7;
          grid.putPx(x, y, lineGlyph(-Math.sin(a) * 0.7, Math.cos(a)), tone(0, alpha), 1);
        }
      }
    }
  }

  private glyph(code: number): string {
    let g = this.glyphs.get(code);
    if (g === undefined) {
      g = String.fromCharCode(code);
      this.glyphs.set(code, g);
    }
    return g;
  }

  private paint() {
    const { grid, ctx } = this;
    grid.clear();
    this.scene.draw(grid, this.world);
    this.drawRipples();

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.world.width, this.world.height);
    ctx.font = this.font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let current = -1;
    const { cols, rows, cellW, cellH, chars, colors } = grid;
    for (let row = 0; row < rows; row++) {
      const y = (row + 0.5) * cellH;
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        const ch = chars[i];
        if (ch === 0) continue;
        if (colors[i] !== current) {
          current = colors[i];
          ctx.fillStyle = this.palette[current] ?? '#fff';
        }
        ctx.fillText(this.glyph(ch), (col + 0.5) * cellW, y);
      }
    }
  }
}
