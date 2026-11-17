import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { monthLabel, monthShort } from '../lib/dates';
import { formatAxis, formatSigned } from '../lib/money';
import { type MonthTotals, niceTicks } from '../lib/stats';

interface Props {
  rows: MonthTotals[];
  currency: string;
}

const HEIGHT = 148;
const PAD = { top: 10, right: 6, bottom: 26, left: 44 };
const SERIES = [
  { key: 'income', name: 'Revenus', sign: 1, className: 'trend__income' },
  { key: 'expense', name: 'Dépenses', sign: -1, className: 'trend__expense' },
] as const;

/**
 * Income and expense per month, one line each, on one axis. Dragging across the plot, or the
 * arrow keys, moves the readout above it to another month; at rest it reads the last month.
 */
export function TrendChart({ rows, currency }: Props) {
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
  const ticks = niceTicks(Math.max(...rows.map((r) => Math.max(r.income, r.expense))));
  const top = ticks.at(-1) || 1;
  const band = (width - PAD.left - PAD.right) / rows.length;
  const x = (i: number) => PAD.left + band * (i + 0.5);
  const y = (v: number) => PAD.top + (1 - v / top) * (HEIGHT - PAD.top - PAD.bottom);
  const line = (key: 'income' | 'expense') => rows.map((r, i) => `${i ? 'L' : 'M'}${x(i)} ${y(r[key])}`).join('');
  const floor = y(0);

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
    <section className="card trend" aria-labelledby="trend-title">
      <div className="card__head">
        <h2 id="trend-title" className="card__title">
          Évolution sur {rows.length} mois
        </h2>
        <span className="trend__month">{monthLabel(row.month)}</span>
      </div>

      <ul className="trend__legend">
        {SERIES.map((s) => (
          <li key={s.key}>
            <span className={`trend__key ${s.className}`} aria-hidden="true" />
            <span className="trend__name">{s.name}</span>
            <span className="trend__value">{formatSigned(s.sign * row[s.key], currency)}</span>
          </li>
        ))}
      </ul>

      <div ref={box} className="trend__plot">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Revenus et dépenses des ${rows.length} derniers mois. Flèches gauche et droite pour changer de mois.`}
          tabIndex={0}
          onPointerDown={pick}
          onPointerMove={pick}
          onPointerLeave={() => setFocus(null)}
          onKeyDown={step}
          onBlur={() => setFocus(null)}
        >
          {ticks.map((t) => (
            <g key={t} className="trend__grid">
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text x={PAD.left - 8} y={y(t)} dy="0.35em" textAnchor="end">
                {formatAxis(t)}
              </text>
            </g>
          ))}

          <line className="trend__cursor" x1={x(at)} x2={x(at)} y1={PAD.top} y2={floor} />

          <path className="trend__wash" d={`${line('income')}L${x(last)} ${floor}L${x(0)} ${floor}Z`} />
          {SERIES.map((s) => (
            <path key={s.key} className={`trend__line ${s.className}`} d={line(s.key)} />
          ))}
          {SERIES.map((s) => (
            <circle key={s.key} className={`trend__dot ${s.className}`} cx={x(at)} cy={y(row[s.key])} r={4} />
          ))}

          {rows.map((r, i) => (
            <text key={r.month} className={`trend__month-tick${i === at ? ' is-on' : ''}`} x={x(i)} y={HEIGHT - 6} textAnchor="middle">
              {monthShort(r.month)}
            </text>
          ))}
        </svg>
      </div>

      <table className="visually-hidden">
        <caption>Revenus et dépenses par mois</caption>
        <thead>
          <tr>
            <th scope="col">Mois</th>
            <th scope="col">Revenus</th>
            <th scope="col">Dépenses</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <th scope="row">{monthLabel(r.month)}</th>
              <td>{formatSigned(r.income, currency)}</td>
              <td>{formatSigned(-r.expense, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
