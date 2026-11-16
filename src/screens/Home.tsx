import { type CSSProperties, useMemo, useState } from 'react';
import { Donut } from '../components/Donut';
import { CategoryIcon } from '../components/CategoryIcon';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { TransactionRow } from '../components/TransactionRow';
import { type MonthKey, monthLabel } from '../lib/dates';
import { formatMoney, formatSigned } from '../lib/money';
import { type Slice, expensesByCategory, foldSlices, groupByDay, inMonth, sliceKey, totals } from '../lib/stats';
import { useStore } from '../store/store';
import type { Transaction } from '../store/types';

interface Props {
  month: MonthKey;
  onMonth: (m: MonthKey) => void;
  onOpen: (t: Transaction) => void;
  onAdd: () => void;
  onSeeAll: () => void;
}

export function Home({ month, onMonth, onOpen, onAdd, onSeeAll }: Props) {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const currency = useStore((s) => s.settings.currency);
  const [active, setActive] = useState<string | null>(null);

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const monthly = useMemo(() => inMonth(transactions, month), [transactions, month]);
  const { sum, breakdown, slices, recent } = useMemo(() => {
    const breakdown = expensesByCategory(monthly);
    return {
      sum: totals(monthly),
      breakdown,
      slices: foldSlices(breakdown),
      recent: groupByDay(monthly)
        .flatMap((g) => g.transactions)
        .slice(0, 5),
    };
  }, [monthly]);

  const colorOf = (s: Slice) => (s.id ? `var(--cat-${byId.get(s.id)?.color ?? 'other'})` : 'var(--cat-other)');
  const labelOf = (s: Slice) => (s.id ? (byId.get(s.id)?.name ?? 'Sans catégorie') : 'Autres');
  const money = (minor: number) => formatMoney(minor, currency);

  return (
    <>
      <MonthSwitcher
        month={month}
        onChange={(m) => {
          setActive(null);
          onMonth(m);
        }}
      />

      <section className="card balance" aria-label="Solde du mois">
        <p className="label">Solde du mois</p>
        <p className={`balance__value${sum.balance < 0 ? ' is-negative' : ''}`}>{formatSigned(sum.balance, currency)}</p>
        <dl className="balance__split">
          <div>
            <dt>Revenus</dt>
            <dd className={sum.income ? 'is-income' : ''}>{formatSigned(sum.income, currency)}</dd>
          </div>
          <div>
            <dt>Dépenses</dt>
            <dd>{formatSigned(-sum.expense, currency)}</dd>
          </div>
        </dl>
      </section>

      <section className="card" aria-labelledby="split-title">
        <h2 id="split-title" className="card__title">
          Dépenses par catégorie
        </h2>
        {breakdown.length === 0 ? (
          <div className="empty">
            <pre className="empty__art" aria-hidden="true">{'   ><(((°>\n ~  ~   ~  ~'}</pre>
            <p>Aucune dépense en {monthLabel(month)}.</p>
            <button type="button" className="button button--primary" onClick={onAdd}>
              Ajouter une dépense
            </button>
          </div>
        ) : (
          <>
            <Donut
              slices={slices}
              colorOf={colorOf}
              labelOf={labelOf}
              active={active}
              onSelect={setActive}
              center={{ value: money(sum.expense), caption: 'dépensés' }}
              activeValue={(s) => money(s.amount)}
            />
            <ul className="split">
              {breakdown.map((s, i) => {
                const category = s.id ? byId.get(s.id) : undefined;
                // Rows past the fifth are the ones folded into the "Autres" segment.
                const key = i < slices.length - 1 || slices.length === breakdown.length ? sliceKey(s) : 'other';
                const budget = category?.budget;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      style={{ '--tile': colorOf(s) } as CSSProperties}
                      className={`split__row${active === key ? ' is-on' : ''}`}
                      aria-pressed={active === key}
                      onClick={() => setActive(active === key ? null : key)}
                    >
                      <CategoryIcon category={category} />
                      <span className="split__name">{labelOf(s)}</span>
                      <span className="split__share">{Math.round(s.share * 100)} %</span>
                      <span className="split__amount">{money(s.amount)}</span>
                      {budget !== undefined && (
                        <span className="budget">
                          <span className="budget__bar">
                            <span
                              className={s.amount > budget ? 'is-over' : ''}
                              style={{ width: `${Math.min(100, (s.amount / budget) * 100)}%` }}
                            />
                          </span>
                          <span className="budget__text">
                            {s.amount > budget ? `Dépassé de ${money(s.amount - budget)}` : `Reste ${money(budget - s.amount)}`}
                          </span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {recent.length > 0 && (
        <section className="card" aria-labelledby="recent-title">
          <div className="card__head">
            <h2 id="recent-title" className="card__title">
              Dernières opérations
            </h2>
            <button type="button" className="link" onClick={onSeeAll}>
              Tout voir
            </button>
          </div>
          <ul className="tx-list">
            {recent.map((t) => (
              <TransactionRow key={t.id} transaction={t} category={byId.get(t.categoryId)} currency={currency} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
