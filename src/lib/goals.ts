import type { Goal } from '../store/types';
import { type DayKey, daysBetween, shortDay } from './dates';

/** Days before a deadline a goal still short of its target is flagged. */
export const LEAD_DAYS = 7;

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
