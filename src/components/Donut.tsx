import type { CSSProperties } from 'react';
import { type Slice, sliceKey } from '../lib/stats';

interface Props {
  slices: Slice[];
  colorOf: (slice: Slice) => string;
  labelOf: (slice: Slice) => string;
  active: string | null;
  onSelect: (key: string | null) => void;
  /** Shown in the hole when nothing is selected. */
  center: { value: string; caption: string };
  activeValue: (slice: Slice) => string;
}

const SIZE = 200;
const RADIUS = 82;
const THICKNESS = 26;
/** 2px of surface between segments, as an angle on the ring's midline. */
const GAP = 2 / RADIUS;

function arc(start: number, end: number): string {
  const c = SIZE / 2;
  const x0 = c + RADIUS * Math.sin(start);
  const y0 = c - RADIUS * Math.cos(start);
  const x1 = c + RADIUS * Math.sin(end);
  const y1 = c - RADIUS * Math.cos(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${x1} ${y1}`;
}

/**
 * Expense split. Tapping a segment selects it, the hole then shows its figures.
 * The list next to it carries every name and amount, so color is never the only key.
 */
export function Donut({ slices, colorOf, labelOf, active, onSelect, center, activeValue }: Props) {
  const selected = slices.find((s) => sliceKey(s) === active);
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((sum, s) => sum + s.share * Math.PI * 2, 0));

  return (
    <div className="donut">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Répartition des dépenses par catégorie">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} className="donut__track" strokeWidth={THICKNESS} />
        {slices.map((s, i) => {
          const sweep = s.share * Math.PI * 2;
          const start = starts[i];
          const key = sliceKey(s);
          const dim = active !== null && active !== key;
          const props = {
            stroke: colorOf(s),
            strokeWidth: key === active ? THICKNESS + 6 : THICKNESS,
            className: `donut__slice${dim ? ' is-dim' : ''}`,
            onClick: () => onSelect(key === active ? null : key),
            // Each segment draws in after the one before it: one sweep around the ring.
            pathLength: 1,
            style: { '--at': (start ?? 0) / (Math.PI * 2), '--len': s.share } as CSSProperties,
          };
          return slices.length === 1 ? (
            <circle key={key} cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" {...props}>
              <title>{labelOf(s)}</title>
            </circle>
          ) : (
            <path key={key} d={arc(start + GAP / 2, start + Math.max(sweep - GAP / 2, GAP / 2))} fill="none" {...props}>
              <title>{labelOf(s)}</title>
            </path>
          );
        })}
      </svg>
      <div className="donut__center" aria-live="polite">
        {selected ? (
          <>
            <span className="donut__value">{activeValue(selected)}</span>
            <span className="donut__caption">
              {labelOf(selected)} · {Math.round(selected.share * 100)} %
            </span>
          </>
        ) : (
          <>
            <span className="donut__value">{center.value}</span>
            <span className="donut__caption">{center.caption}</span>
          </>
        )}
      </div>
    </div>
  );
}
