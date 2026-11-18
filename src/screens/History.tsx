import { useMemo, useState } from 'react';
import { FlowChart } from '../components/FlowChart';
import { GoalList } from '../components/GoalList';
import { PeriodSwitcher } from '../components/PeriodSwitcher';
import { Segmented } from '../components/Segmented';
import { TransactionRow } from '../components/TransactionRow';
import { type Period, dayLabel, periodLabel } from '../lib/dates';
import { formatMoney, formatSigned } from '../lib/money';
import { sortRecurring } from '../lib/recurring';
import { byCategory, foldSlices, groupByDay, inPeriod, matchesQuery, totals } from '../lib/stats';
import { categoryColor, useStore } from '../store/store';
import type { Goal, Kind, Recurring, Transaction } from '../store/types';

interface Props {
  period: Period;
  onPeriod: (p: Period) => void;
  onOpen: (t: Transaction) => void;
  onGoal: (goal?: Goal) => void;
  onRecurring: (recurring?: Recurring) => void;
}

export function History({ period, onPeriod, onOpen, onGoal, onRecurring }: Props) {
  const [view, setView] = useState<'entries' | 'goals' | 'flow'>('entries');
  const transactions = useStore((s) => s.transactions);
  const goals = useStore((s) => s.goals);
  const recurring = useStore((s) => s.recurring);
  const categories = useStore((s) => s.categories);
  const currency = useStore((s) => s.settings.currency);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [flowKind, setFlowKind] = useState<Kind>('expense');

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const groups = useMemo(
    () =>
      groupByDay(
        inPeriod(transactions, period).filter(
          (t) => (kind === 'all' || t.kind === kind) && matchesQuery(t, byId.get(t.categoryId), query),
        ),
      ),
    [transactions, period, kind, query, byId],
  );

  const switcher = (
    <Segmented
      label="Afficher"
      value={view}
      onChange={setView}
      options={[
        { value: 'entries', label: 'Opérations' },
        { value: 'goals', label: 'Objectifs' },
        { value: 'flow', label: 'Cash-flow' },
      ]}
    />
  );

  if (view === 'flow') {
    const fixed = totals(recurring);
    const scoped = inPeriod(transactions, period);
    const slices = foldSlices(byCategory(scoped, flowKind));
    const sum = totals(scoped);
    const money = (minor: number) => formatMoney(minor, currency);
    return (
      <>
        {switcher}
        <PeriodSwitcher period={period} onChange={onPeriod} />
        <section className="card" aria-labelledby="flow-title">
          <h2 id="flow-title" className="card__title">
            {flowKind === 'expense' ? 'Où va l’argent' : 'D’où vient l’argent'}
          </h2>
          <Segmented
            label="Flux"
            value={flowKind}
            onChange={setFlowKind}
            options={[
              { value: 'expense', label: 'Dépenses' },
              { value: 'income', label: 'Revenus' },
            ]}
          />
          {slices.length === 0 ? (
            <p className="empty">{flowKind === 'expense' ? 'Aucune dépense sur cette période.' : 'Aucun revenu sur cette période.'}</p>
          ) : (
            // A new key replays the ribbons drawing in when the kind or the period changes.
            <FlowChart
              key={`${flowKind}-${period}`}
              kind={flowKind}
              slices={slices}
              total={money(flowKind === 'expense' ? sum.expense : sum.income)}
              caption={`${periodLabel(period)} · ${slices.length > 1 ? `${slices.length} catégories` : '1 catégorie'}`}
              categoryOf={(s) => (s.id ? byId.get(s.id) : undefined)}
              colorOf={(s) => categoryColor(s.id ? byId.get(s.id) : undefined)}
              labelOf={(s) => (s.id ? (byId.get(s.id)?.name ?? 'Sans catégorie') : 'Autres')}
              money={money}
            />
          )}
        </section>
        <section className="card" aria-labelledby="recurring-title">
          <h2 id="recurring-title" className="card__title">
            Chaque mois
          </h2>
          {recurring.length > 0 ? (
            <>
              <ul className="tx-list">
                {sortRecurring(recurring).map((r) => (
                  <TransactionRow key={r.id} transaction={r} category={byId.get(r.categoryId)} currency={currency} onOpen={onRecurring} />
                ))}
              </ul>
              <dl className="balance__split recurring__sum">
                <div>
                  <dt>Revenus</dt>
                  <dd className={fixed.income ? 'is-income' : ''}>{formatSigned(fixed.income, currency)}</dd>
                </div>
                <div>
                  <dt>Dépenses</dt>
                  <dd>{formatSigned(-fixed.expense, currency)}</dd>
                </div>
                <div className="balance__full">
                  <dt>Reste chaque mois</dt>
                  <dd className={fixed.balance > 0 ? 'is-income' : fixed.balance < 0 ? 'is-negative' : ''}>
                    {formatSigned(fixed.balance, currency)}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="hint">Un salaire, un loyer, un abonnement : ajoutés le 1er de chaque mois, puis modifiables comme les autres opérations.</p>
          )}
        </section>
        <button type="button" className="button button--wide" onClick={() => onRecurring()}>
          Nouvelle opération récurrente
        </button>
      </>
    );
  }

  if (view === 'goals') {
    return (
      <>
        {switcher}
        {goals.length > 0 ? (
          <section className="card" aria-label="Objectifs">
            <GoalList goals={goals} currency={currency} onOpen={onGoal} />
          </section>
        ) : (
          <p className="card empty">Aucun objectif pour l’instant.</p>
        )}
        <button type="button" className="button button--wide" onClick={() => onGoal()}>
          Nouvel objectif
        </button>
      </>
    );
  }

  return (
    <>
      {switcher}
      <PeriodSwitcher period={period} onChange={onPeriod} />

      <div className="filters">
        <label className="search">
          <span className="visually-hidden">Rechercher</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une note, une catégorie"
          />
        </label>
        <Segmented
          label="Filtrer par type"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: 'Tout' },
            { value: 'expense', label: 'Dépenses' },
            { value: 'income', label: 'Revenus' },
          ]}
        />
      </div>

      {groups.length === 0 ? (
        <p className="card empty">
          {query || kind !== 'all' ? 'Aucune opération ne correspond.' : 'Aucune opération sur cette période.'}
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.day} className="card day" aria-label={dayLabel(g.day)}>
            <div className="day__head">
              <h2>{dayLabel(g.day)}</h2>
              <span className={g.balance > 0 ? 'is-income' : ''}>{formatSigned(g.balance, currency)}</span>
            </div>
            <ul className="tx-list">
              {g.transactions.map((t) => (
                <TransactionRow key={t.id} transaction={t} category={byId.get(t.categoryId)} currency={currency} onOpen={onOpen} />
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
