import { Repeat } from 'lucide-react';
import { formatMoney } from '../lib/money';
import type { Category, Transaction } from '../store/types';
import { CategoryIcon } from './CategoryIcon';

/** An entry, or a recurring entry: what a row shows. */
type Entry = Pick<Transaction, 'kind' | 'amount' | 'note' | 'recurringId'>;

interface Props<T extends Entry> {
  transaction: T;
  category: Category | undefined;
  currency: string;
  onOpen: (t: T) => void;
}

export function TransactionRow<T extends Entry>({ transaction: t, category, currency, onOpen }: Props<T>) {
  const income = t.kind === 'income';
  return (
    <li>
      <button type="button" className="tx" onClick={() => onOpen(t)}>
        <CategoryIcon category={category} />
        <span className="tx__text">
          <span className="tx__title">
            {t.note || category?.name || 'Sans catégorie'}
            {t.recurringId && (
              <>
                <Repeat className="tx__repeat" aria-hidden="true" />
                <span className="visually-hidden">, ajoutée chaque mois</span>
              </>
            )}
          </span>
          {t.note && category && <span className="tx__sub">{category.name}</span>}
        </span>
        <span className={`tx__amount${income ? ' is-income' : ''}`}>
          {income ? '+' : '−'}
          {formatMoney(t.amount, currency)}
        </span>
      </button>
    </li>
  );
}
