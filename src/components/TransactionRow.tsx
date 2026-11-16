import { formatMoney } from '../lib/money';
import type { Category, Transaction } from '../store/types';
import { Glyph } from './Glyph';

interface Props {
  transaction: Transaction;
  category: Category | undefined;
  currency: string;
  onOpen: (t: Transaction) => void;
}

export function TransactionRow({ transaction: t, category, currency, onOpen }: Props) {
  const income = t.kind === 'income';
  return (
    <li>
      <button type="button" className="tx" onClick={() => onOpen(t)}>
        <Glyph category={category} />
        <span className="tx__text">
          <span className="tx__title">{t.note || category?.name || 'Sans catégorie'}</span>
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
