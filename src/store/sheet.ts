import type { DayKey } from '../lib/dates';
import { MAX_AMOUNT, SCALE } from '../lib/money';
import type { Sheet } from '../lib/xlsx';
import type { Category, Kind, Transaction } from './types';

export interface SheetImport {
  /** Categories the file names that did not exist yet. */
  categories: Category[];
  transactions: Transaction[];
  /** Filled rows that could not be read. */
  skipped: number;
}

const norm = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();

/** "Dépense", "Revenus": the Type column, or the name of a sheet holding one kind only. */
function kindOf(text: string): Kind | undefined {
  const t = norm(text);
  if (/^depenses?$/.test(t)) return 'expense';
  if (/^revenus?$/.test(t)) return 'income';
  return undefined;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-11-14", "14/11/2026", "14.11.26" or an Excel day serial. A time after the date is ignored. */
export function readDate(text: string): DayKey | null {
  const t = text.trim();
  let parts: number[];
  if (/^\d{4,5}(\.\d+)?$/.test(t)) {
    // Excel counts 1900-01-01 as day 1 plus a 29 February 1900 that never was: from March 1900 on, day 0 is 1899-12-30.
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(t)) * 86_400_000);
    parts = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
  } else {
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
    const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/.exec(t);
    if (iso) parts = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    else if (dmy?.[3]) parts = [Number(dmy[3]) + (dmy[3].length === 2 ? 2000 : 0), Number(dmy[2]), Number(dmy[1])];
    else return null;
  }
  const [y = 0, m = 0, d = 0] = parts;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Amount without its sign, in minor units: "23,40", "-1 234,56 €", "1.234,56" or Excel's "239.49". */
export function readAmount(text: string): number | null {
  const t = text.replace(/[^\d,.]/g, '');
  // The last separator is the decimal one, the others group thousands.
  const point = Math.max(t.lastIndexOf(','), t.lastIndexOf('.'));
  const value = point < 0 ? Number(t) : Number(`${t.slice(0, point).replace(/[,.]/g, '')}.${t.slice(point + 1)}`);
  const minor = Math.round(value * SCALE);
  return Number.isFinite(minor) && minor > 0 && minor <= MAX_AMOUNT ? minor : null;
}

const COLUMNS = {
  date: (h: string) => h.startsWith('date'),
  amount: (h: string) => h.startsWith('montant'),
  type: (h: string) => h === 'type',
  category: (h: string) => h.startsWith('categorie'),
  note: (h: string) => /^(note|comment|libelle)/.test(h),
};

const FORMAT_HINT = 'Touchez « i » pour voir le format attendu.';

/**
 * Entries of a spreadsheet, to add to the current ones. Each sheet needs a header row with
 * at least Date and Montant; the kind comes from a Type column, else from the sheet name.
 * Throws a message meant for the user.
 */
export function readSheets(sheets: Sheet[], existing: Category[], now = Date.now()): SheetImport {
  const known = new Map(existing.map((c) => [`${c.kind}:${norm(c.name)}`, c]));
  const categories: Category[] = [];
  const transactions: Transaction[] = [];
  let skipped = 0;
  let found = false;

  for (const sheet of sheets) {
    const at = sheet.rows.findIndex((r) => r.some((c) => COLUMNS.date(norm(c))) && r.some((c) => COLUMNS.amount(norm(c))));
    if (at < 0) continue;
    found = true;
    const head = (sheet.rows[at] ?? []).map(norm);
    const [date, amount, type, category, note] = (['date', 'amount', 'type', 'category', 'note'] as const).map((key) =>
      head.findIndex(COLUMNS[key]),
    );
    const sheetKind = kindOf(sheet.name);

    for (const row of sheet.rows.slice(at + 1)) {
      if (row.every((c) => !c.trim())) continue;
      const cell = (i: number) => (row[i] ?? '').trim();
      const day = readDate(cell(date));
      const minor = readAmount(cell(amount));
      const kind = kindOf(cell(type)) ?? sheetKind;
      if (!day || !minor || !kind) {
        skipped++;
        continue;
      }
      // Same length cap as the category form.
      const name = (cell(category) || (kind === 'expense' ? 'Autres' : 'Autres revenus')).slice(0, 24);
      const key = `${kind}:${norm(name)}`;
      let target = known.get(key);
      if (!target) {
        target = { id: crypto.randomUUID(), kind, name, icon: 'tag', color: (existing.length + categories.length) % 8 };
        categories.push(target);
        known.set(key, target);
      }
      transactions.push({
        id: crypto.randomUUID(),
        kind,
        amount: minor,
        categoryId: target.id,
        date: day,
        note: cell(note),
        createdAt: now + transactions.length,
      });
    }
  }

  if (!found) throw new Error(`Colonnes Date et Montant introuvables. ${FORMAT_HINT}`);
  if (transactions.length === 0) throw new Error(`Aucune ligne lisible. ${FORMAT_HINT}`);
  return { categories, transactions, skipped };
}
