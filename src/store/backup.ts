import { CURRENCIES } from './defaults';
import type { Category, Kind, Settings, ThemeId, Transaction } from './types';

export interface Backup {
  app: 'kakuzu';
  version: 1;
  exportedAt: string;
  categories: Category[];
  transactions: Transaction[];
  settings: Settings;
}

const KINDS: Kind[] = ['expense', 'income'];
const THEMES: ThemeId[] = ['koi', 'butterflies', 'herons', 'frogs', 'jellyfish'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isMinor = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;

function readCategory(v: unknown): Category | null {
  if (!isObject(v)) return null;
  const { id, kind, name, glyph, color, budget } = v;
  if (typeof id !== 'string' || typeof name !== 'string' || typeof glyph !== 'string') return null;
  if (!KINDS.includes(kind as Kind) || !Number.isInteger(color)) return null;
  return {
    id,
    kind: kind as Kind,
    name,
    glyph,
    color: Math.abs(color as number) % 8,
    ...(isMinor(budget) ? { budget } : {}),
  };
}

function readTransaction(v: unknown): Transaction | null {
  if (!isObject(v)) return null;
  const { id, kind, amount, categoryId, date, note, createdAt } = v;
  if (typeof id !== 'string' || typeof categoryId !== 'string') return null;
  if (!KINDS.includes(kind as Kind) || !isMinor(amount)) return null;
  if (typeof date !== 'string' || !DAY.test(date)) return null;
  return {
    id,
    kind: kind as Kind,
    amount,
    categoryId,
    date,
    note: typeof note === 'string' ? note : '',
    createdAt: typeof createdAt === 'number' ? createdAt : 0,
  };
}

/** Validates an imported file. Throws a message meant for the user. */
export function readBackup(json: string, fallback: Settings): Omit<Backup, 'exportedAt'> {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde Kakuzu.");
  }
  if (!isObject(data) || data.app !== 'kakuzu' || !Array.isArray(data.categories) || !Array.isArray(data.transactions)) {
    throw new Error("Ce fichier n'est pas une sauvegarde Kakuzu.");
  }
  const categories = data.categories.map(readCategory).filter((c): c is Category => c !== null);
  const known = new Set(categories.map((c) => c.id));
  const transactions = data.transactions
    .map(readTransaction)
    .filter((t): t is Transaction => t !== null && known.has(t.categoryId));
  if (categories.length === 0) throw new Error('La sauvegarde ne contient aucune catégorie.');

  const s = isObject(data.settings) ? data.settings : {};
  const settings: Settings = {
    theme: THEMES.includes(s.theme as ThemeId) ? (s.theme as ThemeId) : fallback.theme,
    // An unknown code would make every money format throw.
    currency: CURRENCIES.includes(s.currency as string) ? (s.currency as string) : fallback.currency,
    motion: typeof s.motion === 'boolean' ? s.motion : fallback.motion,
  };
  return { app: 'kakuzu', version: 1, categories, transactions, settings };
}
