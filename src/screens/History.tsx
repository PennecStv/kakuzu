import { useMemo, useState } from 'react';
import { PeriodSwitcher } from '../components/PeriodSwitcher';
import { Segmented } from '../components/Segmented';
import { TransactionRow } from '../components/TransactionRow';
import { type Period, dayLabel } from '../lib/dates';
import { formatSigned } from '../lib/money';
import { groupByDay, inPeriod, matchesQuery } from '../lib/stats';
import { useStore } from '../store/store';
import type { Kind, Transaction } from '../store/types';

interface Props {
  period: Period;
  onPeriod: (p: Period) => void;
  onOpen: (t: Transaction) => void;
}

export function History({ period, onPeriod, onOpen }: Props) {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const currency = useStore((s) => s.settings.currency);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind | 'all'>('all');

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

  return (
    <>
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
