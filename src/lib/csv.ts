import type { Category, Transaction } from '../store/types';
import { SCALE, currencyDigits } from './money';

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
      const signed = (t.kind === 'income' ? t.amount : -t.amount) / SCALE;
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

/** Text of a CSV file: UTF-8, else Windows-1252, which Excel in French still saves by default. */
export function decodeCsv(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/** Rows of a CSV text. The separator is whichever of ";", "," or tab the first line holds most. */
export function parseCsv(text: string): string[][] {
  const head = text.split('\n', 1)[0] ?? '';
  const separator = [';', ',', '\t'].reduce((best, s) => (head.split(s).length > head.split(best).length ? s : best));
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === separator) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      rows.push([...row, cell]);
      row = [];
      cell = '';
    } else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}
