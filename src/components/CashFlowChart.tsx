import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { monthLabel, monthShort } from '../lib/dates';
import { formatAxis, formatSigned } from '../lib/money';
import { type FlowRow, niceRange } from '../lib/stats';

interface Props {
  rows: FlowRow[];
  currency: string;
  /** Shows the balance each month closes on, which only means something when it is carried over. */
  closing: boolean;
}

const HEIGHT = 160;
const PAD = { top: 10, right: 6, bottom: 26, left: 44 };
const BAR = 24;
const RADIUS = 4;

/** A column from the zero line to `top`, square at the line and rounded at the far end. */
function column(x: number, base: number, top: number, width: number): string {
  const r = Math.min(RADIUS, Math.abs(base - top), width / 2);
  const dir = top < base ? 1 : -1;
  const left = x - width / 2;
  const right = x + width / 2;
  return `M${left} ${base}V${top + dir * r}Q${left} ${top} ${left + r} ${top}H${right - r}Q${right} ${top} ${right} ${top + dir * r}V${base}Z`;
}

/**
 * What is left of each month, a column above zero for a month that gained money, below for one that
 * lost some. Dragging across the plot, or the arrow keys, moves the readout to another month; at rest
 * it reads the last one.
 */
export function CashFlowChart({ rows, currency, closing }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [focus, setFocus] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const last = rows.length - 1;
  const at = focus ?? last;
  const row = rows[at];
  const nets = rows.map((r) => r.net);
  const ticks = niceRange(Math.min(...nets), Math.max(...nets));
  const low = ticks[0] ?? 0;
  const high = ticks.at(-1) ?? 0;
  // A hidden plot measures 0 wide: keep the geometry from going negative.
  const band = Math.max(0, width - PAD.left - PAD.right) / rows.length;
  const bar = Math.min(BAR, band * 0.6);
  const x = (i: number) => PAD.left + band * (i + 0.5);
  const y = (v: number) => PAD.top + ((high - v) / (high - low || 1)) * (HEIGHT - PAD.top - PAD.bottom);

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const left = e.currentTarget.getBoundingClientRect().left;
    setFocus(Math.max(0, Math.min(last, Math.floor((e.clientX - left - PAD.left) / band))));
  };
  const step = (e: KeyboardEvent) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    setFocus(Math.max(0, Math.min(last, at + delta)));
  };

  if (!row) return null;

  return (
    <section className="card trend" aria-labelledby="flow-title">
      <div className="card__head">
        <h2 id="flow-title" className="card__title">
          Cash-flow sur {rows.length} mois
        </h2>
        <span className="trend__month">{monthLabel(row.month)}</span>
      </div>

      <dl className="flow__readout">
        <div>
          <dt>Revenus</dt>
          <dd className={row.income ? 'is-income' : ''}>{formatSigned(row.income, currency)}</dd>
        </div>
        <div>
          <dt>Dépenses</dt>
          <dd>{formatSigned(-row.expense, currency)}</dd>
        </div>
        <div>
          <dt>Reste du mois</dt>
          <dd className={row.net > 0 ? 'is-income' : row.net < 0 ? 'is-negative' : ''}>{formatSigned(row.net, currency)}</dd>
        </div>
        {closing && (
          <div>
            <dt>Solde en fin de mois</dt>
            <dd className={row.closing < 0 ? 'is-negative' : ''}>{formatSigned(row.closing, currency)}</dd>
          </div>
        )}
      </dl>

      <div ref={box} className="trend__plot">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Ce qui reste de chacun des ${rows.length} derniers mois. Flèches gauche et droite pour changer de mois.`}
          tabIndex={0}
          onPointerDown={pick}
          onPointerMove={pick}
          onPointerLeave={() => setFocus(null)}
          onKeyDown={step}
          onBlur={() => setFocus(null)}
        >
          <rect className="flow__focus" x={x(at) - band / 2} y={PAD.top} width={band} height={HEIGHT - PAD.top - PAD.bottom} rx={4} />

          {ticks.map((t) => (
            <g key={t} className={`trend__grid${t === 0 ? ' flow__zero' : ''}`}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text x={PAD.left - 8} y={y(t)} dy="0.35em" textAnchor="end">
                {formatAxis(t)}
              </text>
            </g>
          ))}

          {rows.map(
            (r, i) =>
              r.net !== 0 && (
                <path key={r.month} className={`flow__bar${r.net > 0 ? ' is-gain' : ''}`} d={column(x(i), y(0), y(r.net), bar)} />
              ),
          )}

          {rows.map((r, i) => (
            <text key={r.month} className={`trend__month-tick${i === at ? ' is-on' : ''}`} x={x(i)} y={HEIGHT - 6} textAnchor="middle">
              {monthShort(r.month)}
            </text>
          ))}
        </svg>
      </div>

      <table className="visually-hidden">
        <caption>Cash-flow par mois</caption>
        <thead>
          <tr>
            <th scope="col">Mois</th>
            <th scope="col">Revenus</th>
            <th scope="col">Dépenses</th>
            <th scope="col">Reste</th>
            {closing && <th scope="col">Solde en fin de mois</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <th scope="row">{monthLabel(r.month)}</th>
              <td>{formatSigned(r.income, currency)}</td>
              <td>{formatSigned(-r.expense, currency)}</td>
              <td>{formatSigned(r.net, currency)}</td>
              {closing && <td>{formatSigned(r.closing, currency)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
