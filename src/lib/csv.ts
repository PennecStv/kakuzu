import type { Category, Transaction } from '../store/types';
import { currencyDigits } from './money';

function cell(value: string): string {
  return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Semicolon-separated with a decimal comma, so Excel in French opens it as is. */
export function toCsv(transactions: Transaction[], categories: Category[], currency: string): string {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const digits = currencyDigits(currency);
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((t) => {
      const signed = (t.kind === 'income' ? t.amount : -t.amount) / 10 ** digits;
      return [
        t.date,
        t.kind === 'income' ? 'Revenu' : 'Dépense',
        byId.get(t.categoryId)?.name ?? '',
        signed.toFixed(digits).replace('.', ','),
        t.note,
      ]
        .map(cell)
        .join(';');
    });
  return ['Date;Type;Catégorie;Montant;Note', ...rows].join('\n');
}
