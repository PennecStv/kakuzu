/** A calendar day as "YYYY-MM-DD", in local time. */
export type DayKey = string;
/** A month as "YYYY-MM". */
export type MonthKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function today(): DayKey {
  return toDayKey(new Date());
}

export function parseDay(day: DayKey): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function monthOf(day: DayKey): MonthKey {
  return day.slice(0, 7);
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function monthLabel(month: MonthKey): string {
  return monthFormat.format(parseDay(`${month}-01`));
}

const shortMonthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

/** "nov.", "juin": a chart axis label. */
export function monthShort(month: MonthKey): string {
  return shortMonthFormat.format(parseDay(`${month}-01`));
}

export function dayLabel(day: DayKey, now: DayKey = today()): string {
  if (day === now) return "Aujourd'hui";
  const yesterday = parseDay(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === toDayKey(yesterday)) return 'Hier';
  const label = dayFormat.format(parseDay(day));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
