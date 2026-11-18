import type { Goal, Reminders } from '../store/types';
import { type DayKey, daysBetween, parseDay, shortDay, toDayKey } from './dates';
import { formatMoney } from './money';

/** `soon` from `leadDays` before the deadline of a goal still short of its target, `late` past it. */
export type Urgency = 'none' | 'soon' | 'late';

export function urgency(goal: Goal, now: DayKey, leadDays: number): Urgency {
  if (!goal.deadline || goal.saved >= goal.target) return 'none';
  const left = daysBetween(now, goal.deadline);
  if (left < 0) return 'late';
  return left <= leadDays ? 'soon' : 'none';
}

/** The deadline as a date while it is far, as a count of days once it is pressing. */
export function deadlineLabel(deadline: DayKey, now: DayKey, pressing: boolean): string {
  const left = daysBetween(now, deadline);
  if (left < 0) return 'Date butoir dépassée';
  if (!pressing) return `Date butoir : ${shortDay(deadline, now)}`;
  if (left === 0) return 'Date butoir aujourd’hui';
  return left === 1 ? 'Date butoir demain' : `Date butoir dans ${left} jours`;
}

export interface Reminder {
  id: number;
  at: Date;
  title: string;
  body: string;
}

/** A stable notification id for a goal: Android wants a 32-bit integer. */
export function reminderId(goalId: string): number {
  // FNV-1a.
  let hash = 0x811c9dc5;
  for (const char of goalId) hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 0x01000193);
  return hash >>> 1;
}

/**
 * One notification per goal short of its target, `days` before its deadline at `hour`. When that
 * moment has passed, the next `hour` to come instead, as long as the deadline has not.
 */
export function goalReminders(goals: Goal[], now: Date, settings: Pick<Reminders, 'days' | 'hour'>, currency: string): Reminder[] {
  const at = (day: DayKey) => {
    const date = parseDay(day);
    date.setHours(settings.hour);
    return date;
  };
  const reminders: Reminder[] = [];
  for (const goal of goals) {
    if (!goal.deadline || goal.saved >= goal.target) continue;
    const first = parseDay(goal.deadline);
    first.setDate(first.getDate() - settings.days);
    let when = at(toDayKey(first));
    if (when <= now) when = at(toDayKey(now));
    if (when <= now) when = at(toDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)));
    if (toDayKey(when) > goal.deadline) continue;
    const today = toDayKey(when);
    reminders.push({
      id: reminderId(goal.id),
      at: when,
      title: `Objectif : ${goal.name}`,
      body: `Encore ${formatMoney(goal.target - goal.saved, currency)} à mettre de côté. ${deadlineLabel(goal.deadline, today, true)}.`,
    });
  }
  return reminders;
}
