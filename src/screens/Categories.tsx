import { type CSSProperties, useMemo, useState } from 'react';
import { CategoryIcon } from '../components/CategoryIcon';
import { Segmented } from '../components/Segmented';
import { type MonthKey, monthLabel } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { inMonth, sumByCategory } from '../lib/stats';
import { categoriesOf, useStore } from '../store/store';
import type { Category, Kind } from '../store/types';

interface Props {
  month: MonthKey;
  onEdit: (kind: Kind, category?: Category) => void;
}

export function Categories({ month, onEdit }: Props) {
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const currency = useStore((s) => s.settings.currency);
  const [kind, setKind] = useState<Kind>('expense');

  const spent = useMemo(() => sumByCategory(inMonth(transactions, month)), [transactions, month]);

  const list = categoriesOf(categories, kind);

  return (
    <>
      <Segmented
        label="Type de catégorie"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'expense', label: 'Dépenses' },
          { value: 'income', label: 'Revenus' },
        ]}
      />
      <section className="card cat-card" aria-label={`Catégories, montants de ${monthLabel(month)}`}>
        <p className="hint">Montants de {monthLabel(month)}. Touchez une catégorie pour la modifier ou lui fixer un budget.</p>
        <ul className="cat-list">
        {list.map((c) => {
          const amount = spent.get(c.id) ?? 0;
          return (
            <li key={c.id}>
              <button
                type="button"
                className="cat"
                style={{ '--tile': `var(--cat-${c.color})` } as CSSProperties}
                onClick={() => onEdit(kind, c)}
              >
                <CategoryIcon category={c} />
                <span className="cat__name">{c.name}</span>
                <span className="cat__amount">{formatMoney(amount, currency)}</span>
                {c.budget !== undefined && (
                  <span className="budget">
                    <span className="budget__bar">
                      <span
                        className={amount > c.budget ? 'is-over' : ''}
                        style={{ width: `${Math.min(100, (amount / c.budget) * 100)}%` }}
                      />
                    </span>
                    <span className="budget__text">sur {formatMoney(c.budget, currency)}</span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
        </ul>
      </section>

      <button type="button" className="button button--wide" onClick={() => onEdit(kind)}>
        Nouvelle catégorie
      </button>
    </>
  );
}
