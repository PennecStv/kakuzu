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

/** A year "YYYY", a month "YYYY-MM" or a day "YYYY-MM-DD": a prefix of the days it holds. */
export type Period = string;
export type Unit = 'day' | 'month' | 'year';

const LENGTH: Record<Unit, number> = { year: 4, month: 7, day: 10 };

export function unitOf(period: Period): Unit {
  if (period.length === LENGTH.year) return 'year';
  return period.length === LENGTH.month ? 'month' : 'day';
}

/** The period of `unit` holding today when `period` does, else the one holding its first day. */
export function withUnit(period: Period, unit: Unit, now: DayKey = today()): Period {
  const day = now.startsWith(period) ? now : `${period}-01-01`.slice(0, LENGTH.day);
  return day.slice(0, LENGTH[unit]);
}

export function shiftPeriod(period: Period, delta: number): Period {
  const unit = unitOf(period);
  if (unit === 'year') return String(Number(period) + delta);
  if (unit === 'month') return shiftMonth(period, delta);
  const date = parseDay(period);
  date.setDate(date.getDate() + delta);
  return toDayKey(date);
}

/** Last month of a period, or the current one while the period is under way. */
export function lastMonth(period: Period, now: DayKey = today()): MonthKey {
  return now.startsWith(period) ? monthOf(now) : `${period}-12`.slice(0, LENGTH.month);
}

export function periodLabel(period: Period, now: DayKey = today()): string {
  const unit = unitOf(period);
  if (unit === 'year') return period;
  return unit === 'month' ? monthLabel(period) : dayLabel(period, now);
}

export function dayLabel(day: DayKey, now: DayKey = today()): string {
  if (day === now) return "Aujourd'hui";
  const yesterday = parseDay(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === toDayKey(yesterday)) return 'Hier';
  const label = dayFormat.format(parseDay(day));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
