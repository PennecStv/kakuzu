import type { CSSProperties } from 'react';
import { type Slice, sliceKey } from '../lib/stats';
import { useStore } from '../store/store';
import type { Category, Kind } from '../store/types';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  kind: Kind;
  /** Largest first, already folded. */
  slices: Slice[];
  total: string;
  caption: string;
  categoryOf: (slice: Slice) => Category | undefined;
  colorOf: (slice: Slice) => string;
  labelOf: (slice: Slice) => string;
  money: (minor: number) => string;
}

// Heights in px, the same as .flow__root and .flow__leaf in app.css.
const ROOT = 76;
const DROP = 36;
const LEAF = 56;
const LEAF_GAP = 8;
/** Width of the column the ribbons turn in; the leaves start at its right edge. */
const TRUNK = 96;
const LEFT = 14;
/** Thickness of a ribbon carrying everything. */
const THICK = 32;
const SPACE = 3;
/** Radius of the turn. LEAF + LEAF_GAP − BEND must stay over THICK / 2, or a turn would touch the ribbon above. */
const BEND = 44;
/** Length of the wave of light running down each ribbon. */
const WAVE = 90;

/**
 * The period's total at the top, a ribbon as thick as its share running down to each category. The
 * first category's ribbon starts rightmost and turns first, so no two ribbons ever cross.
 */
export function FlowChart({ kind, slices, total, caption, categoryOf, colorOf, labelOf, money }: Props) {
  const motion = useStore((s) => s.settings.motion);
  const widths = slices.map((s) => Math.max(3, s.share * THICK));
  const starts: number[] = [];
  let x = LEFT;
  for (let i = slices.length - 1; i >= 0; i--) {
    const w = widths[i] ?? 0;
    starts[i] = x + w / 2;
    x += w + SPACE;
  }
  const height = ROOT + DROP + slices.length * (LEAF + LEAF_GAP) - LEAF_GAP;
  const ribbons = slices.map((s, i) => {
    const from = starts[i] ?? 0;
    const to = ROOT + DROP + i * (LEAF + LEAF_GAP) + LEAF / 2;
    const r = Math.min(BEND, TRUNK - from);
    // Unit vector from the start of the ribbon to its end: the wave of light travels along it.
    const length = Math.hypot(TRUNK - from, to - ROOT);
    const ux = (TRUNK - from) / length;
    const uy = (to - ROOT) / length;
    return {
      key: sliceKey(s),
      from,
      to,
      width: widths[i] ?? 0,
      color: colorOf(s),
      d: `M${from} ${ROOT}V${to - r}A${r} ${r} 0 0 0 ${from + r} ${to}H${TRUNK}`,
      wave: { x: from - ux * WAVE, y: ROOT - uy * WAVE, dx: ux * (length + WAVE), dy: uy * (length + WAVE) },
    };
  });
  // The wave runs as long as the tab is open: off with the Animations switch, and SMIL ignores the
  // reduced-motion rule of app.css.
  const still = !motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className={`flow flow--${kind}`}>
      <svg className="flow__ribbons" width={TRUNK} height={height} aria-hidden="true">
        <defs>
          {ribbons.map((r, i) => (
            <linearGradient key={r.key} id={`flow-${i}`} gradientUnits="userSpaceOnUse" x1={r.from} y1={ROOT} x2={TRUNK} y2={r.to}>
              <stop offset="0" stopOpacity={0.2} style={{ stopColor: r.color }} />
              <stop offset="1" stopOpacity={0.85} style={{ stopColor: r.color }} />
            </linearGradient>
          ))}
          {/* A band of full color, out of the ribbon before the start, slid past its end then held there. */}
          {!still &&
            ribbons.map((r, i) => (
              <linearGradient
                key={r.key}
                id={`wave-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={r.wave.x}
                y1={r.wave.y}
                x2={r.from}
                y2={ROOT}
              >
                <stop offset="0" stopOpacity={0} style={{ stopColor: r.color }} />
                <stop offset="0.75" style={{ stopColor: `color-mix(in srgb, ${r.color} 85%, white)` }} />
                <stop offset="1" stopOpacity={0} style={{ stopColor: r.color }} />
                <animateTransform
                  attributeName="gradientTransform"
                  type="translate"
                  values={`0 0;${r.wave.dx} ${r.wave.dy};${r.wave.dx} ${r.wave.dy}`}
                  keyTimes="0;0.6;1"
                  dur="3s"
                  begin={`${0.9 + i * 0.35}s`}
                  repeatCount="indefinite"
                />
              </linearGradient>
            ))}
        </defs>
        {ribbons.map((r, i) => (
          <g key={r.key} style={{ '--i': i } as CSSProperties}>
            <path className="flow__ribbon" d={r.d} stroke={`url(#flow-${i})`} strokeWidth={r.width} pathLength={1} />
            {!still && <path className="flow__wave" d={r.d} stroke={`url(#wave-${i})`} strokeWidth={r.width} />}
          </g>
        ))}
      </svg>

      <div className="flow__root">
        <span className="flow__kind">{kind === 'expense' ? 'Dépenses' : 'Revenus'}</span>
        <span className="flow__total">{total}</span>
        <span className="flow__caption">{caption}</span>
      </div>

      <ul className="flow__leaves">
        {slices.map((s, i) => (
          <li key={sliceKey(s)} className="flow__leaf" style={{ '--i': i, '--tile': colorOf(s) } as CSSProperties}>
            <CategoryIcon category={categoryOf(s)} />
            <span className="flow__name">{labelOf(s)}</span>
            <span className="flow__share">{Math.round(s.share * 100)} %</span>
            <span className="flow__amount">{money(s.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
