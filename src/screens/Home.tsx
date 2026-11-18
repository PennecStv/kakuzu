import { type CSSProperties, Fragment, type ReactNode, useMemo, useState } from 'react';
import { Donut } from '../components/Donut';
import { FadeList } from '../components/FadeList';
import { GoalList } from '../components/GoalList';
import { CategoryIcon } from '../components/CategoryIcon';
import { PeriodSwitcher } from '../components/PeriodSwitcher';
import { Segmented } from '../components/Segmented';
import { TrendChart } from '../components/TrendChart';
import { TransactionRow } from '../components/TransactionRow';
import { type Period, type Unit, lastMonth, unitOf } from '../lib/dates';
import { formatMoney, formatSigned } from '../lib/money';
import { type Slice, balanceBefore, byCategory, foldSlices, groupByDay, inPeriod, monthlyTotals, sliceKey, totals } from '../lib/stats';
import { homeOrder } from '../store/defaults';
import { categoryColor, useStore } from '../store/store';
import type { Goal, HomeCard, Kind, Transaction } from '../store/types';

interface Props {
  period: Period;
  onPeriod: (p: Period) => void;
  onOpen: (t: Transaction) => void;
  onAdd: (kind: Kind) => void;
  onSeeAll: () => void;
  onGoal: (goal?: Goal) => void;
}

const BALANCE: Record<Unit, string> = { day: 'Solde du jour', month: 'Solde du mois', year: 'Solde de l’année' };

const CARRIED: Record<Unit, string> = {
  day: 'Report de la veille',
  month: 'Report du mois précédent',
  year: 'Report de l’année précédente',
};

const SPLIT: Record<Kind, { caption: string; empty: string; add: string }> = {
  expense: { caption: 'dépensés', empty: 'Aucune dépense sur cette période.', add: 'Ajouter une dépense' },
  income: { caption: 'reçus', empty: 'Aucun revenu sur cette période.', add: 'Ajouter un revenu' },
};

export function Home({ period, onPeriod, onOpen, onAdd, onSeeAll, onGoal }: Props) {
  const transactions = useStore((s) => s.transactions);
  const goals = useStore((s) => s.goals);
  const order = useStore((s) => s.settings.home);
  const categories = useStore((s) => s.categories);
  const currency = useStore((s) => s.settings.currency);
  const carryOver = useStore((s) => s.settings.carryOver);
  const [active, setActive] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>('expense');
  const unit = unitOf(period);

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const scoped = useMemo(() => inPeriod(transactions, period), [transactions, period]);
  const carried = useMemo(() => (carryOver ? balanceBefore(transactions, period) : 0), [carryOver, transactions, period]);
  const trend = useMemo(() => monthlyTotals(transactions, lastMonth(period), 6), [transactions, period]);
  const { sum, breakdown, slices, recent } = useMemo(() => {
    const breakdown = byCategory(scoped, kind);
    return {
      sum: totals(scoped),
      breakdown,
      slices: foldSlices(breakdown),
      recent: groupByDay(scoped)
        .flatMap((g) => g.transactions)
        .slice(0, 5),
    };
  }, [scoped, kind]);

  const colorOf = (s: Slice) => categoryColor(s.id ? byId.get(s.id) : undefined);
  const labelOf = (s: Slice) => (s.id ? (byId.get(s.id)?.name ?? 'Sans catégorie') : 'Autres');
  const money = (minor: number) => formatMoney(minor, currency);

  const cards: Record<HomeCard, ReactNode> = {
    balance: (
      <section className="card balance" aria-label={BALANCE[unit]}>
        <p className="label">{BALANCE[unit]}</p>
        <p className={`balance__value${sum.balance + carried < 0 ? ' is-negative' : ''}`}>
          {formatSigned(sum.balance + carried, currency)}
        </p>
        <dl className="balance__split">
          {carried !== 0 && (
            <div className="balance__full">
              <dt>{CARRIED[unit]}</dt>
              <dd className={carried > 0 ? 'is-income' : ''}>{formatSigned(carried, currency)}</dd>
            </div>
          )}
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
    ),
    split: (
      <section className="card" aria-labelledby="split-title">
        <h2 id="split-title" className="card__title">
          Par catégorie
        </h2>
        <Segmented
          label="Répartition"
          value={kind}
          onChange={(k) => {
            setKind(k);
            setActive(null);
          }}
          options={[
            { value: 'expense', label: 'Dépenses' },
            { value: 'income', label: 'Revenus' },
          ]}
        />
        {breakdown.length === 0 ? (
          <div className="empty">
            <pre className="empty__art" aria-hidden="true">{'   ><(((°>\n ~  ~   ~  ~'}</pre>
            <p>{SPLIT[kind].empty}</p>
            <button type="button" className="button button--primary" onClick={() => onAdd(kind)}>
              {SPLIT[kind].add}
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
              center={{ value: money(kind === 'expense' ? sum.expense : sum.income), caption: SPLIT[kind].caption }}
              activeValue={(s) => money(s.amount)}
            />
            {/* Past the six donut segments the list scrolls instead of stretching the page. */}
            <FadeList key={`${kind}-${period}`} className={breakdown.length > 6 ? 'split split--scroll' : 'split'}>
              {breakdown.map((s, i) => {
                const category = s.id ? byId.get(s.id) : undefined;
                // Rows past the fifth are the ones folded into the "Autres" segment.
                const key = i < slices.length - 1 || slices.length === breakdown.length ? sliceKey(s) : 'other';
                // Budgets are monthly: against a day or a year they would mislead.
                const budget = unit === 'month' ? category?.budget : undefined;
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
            </FadeList>
          </>
        )}
      </section>
    ),
    goals: (
      <section className="card" aria-labelledby="goals-title">
        <div className="card__head">
          <h2 id="goals-title" className="card__title">
            Objectifs
          </h2>
          <button type="button" className="link" onClick={() => onGoal()}>
            Nouvel objectif
          </button>
        </div>
        {goals.length > 0 ? (
          <GoalList goals={goals} currency={currency} onOpen={onGoal} />
        ) : (
          <p className="hint">Un achat, une épargne : fixez un montant à atteindre et versez au fil du temps.</p>
        )}
      </section>
    ),
    trend: trend.some((r) => r.income || r.expense) ? <TrendChart rows={trend} currency={currency} /> : null,
    recent: recent.length > 0 ? (
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
    ) : null,
  };

  return (
    <>
      <PeriodSwitcher
        period={period}
        onChange={(p) => {
          setActive(null);
          onPeriod(p);
        }}
      />
      {homeOrder(order).map((id) => (
        <Fragment key={id}>{cards[id]}</Fragment>
      ))}
    </>
  );
}
