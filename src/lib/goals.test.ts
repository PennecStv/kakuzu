import { describe, expect, it } from 'vitest';
import type { Goal } from '../store/types';
import { deadlineLabel, goalReminders, reminderId, urgency } from './goals';

const goal: Goal = { id: 'pc', name: 'PC neuf', target: 120000, saved: 30000, deadline: '2026-11-25' };

describe('urgency', () => {
  it('flags a goal short of its target from the lead time on', () => {
    expect(urgency(goal, '2026-11-17', 7)).toBe('none');
    expect(urgency(goal, '2026-11-18', 7)).toBe('soon');
    expect(urgency(goal, '2026-11-25', 7)).toBe('soon');
    expect(urgency(goal, '2026-11-26', 7)).toBe('late');
  });

  it('leaves reached goals and goals without a deadline alone', () => {
    expect(urgency({ ...goal, saved: 120000 }, '2026-11-26', 7)).toBe('none');
    expect(urgency({ ...goal, deadline: undefined }, '2026-11-26', 7)).toBe('none');
  });
});

describe('deadlineLabel', () => {
  it('gives the date while it is far', () => {
    expect(deadlineLabel('2026-12-31', '2026-11-18', false)).toBe('Date butoir : 31 déc.');
  });

  it('counts the days once it is pressing', () => {
    expect(deadlineLabel('2026-11-25', '2026-11-18', true)).toBe('Date butoir dans 7 jours');
    expect(deadlineLabel('2026-11-19', '2026-11-18', true)).toBe('Date butoir demain');
    expect(deadlineLabel('2026-11-18', '2026-11-18', true)).toBe('Date butoir aujourd’hui');
    expect(deadlineLabel('2026-11-17', '2026-11-18', true)).toBe('Date butoir dépassée');
  });
});

describe('goalReminders', () => {
  const settings = { days: 7, hour: 9 };
  const when = (r: { at: Date }) => r.at.toString().slice(4, 21);

  it('comes the lead time before the deadline, at the hour picked', () => {
    const [reminder] = goalReminders([{ ...goal, deadline: '2026-12-10' }], new Date(2026, 10, 18, 15), settings, 'EUR');
    expect(when(reminder ?? { at: new Date(0) })).toBe('Dec 03 2026 09:00');
    expect(reminder?.title).toBe('Objectif : PC neuf');
    expect(reminder?.body.replace(/\s/g, ' ')).toBe('Encore 900,00 € à mettre de côté. Date butoir dans 7 jours.');
    expect(reminder?.id).toBe(reminderId('pc'));
  });

  it('comes at the next hour picked once the lead time has started', () => {
    const goals = [{ ...goal, deadline: '2026-11-20' }];
    expect(goalReminders(goals, new Date(2026, 10, 18, 8), settings, 'EUR').map(when)).toEqual(['Nov 18 2026 09:00']);
    expect(goalReminders(goals, new Date(2026, 10, 18, 15), settings, 'EUR').map(when)).toEqual(['Nov 19 2026 09:00']);
  });

  it('skips reached goals, goals without a deadline and deadlines gone by', () => {
    const now = new Date(2026, 10, 25, 15);
    const goals = [{ ...goal, saved: goal.target }, { ...goal, deadline: undefined }, goal];
    expect(goalReminders(goals, now, settings, 'EUR')).toEqual([]);
  });

  it('gives each goal its own id', () => {
    expect(reminderId('pc')).not.toBe(reminderId('trip'));
    expect(reminderId('a1b2c3d4-0000-4000-8000-000000000000')).toBeLessThan(2 ** 31);
  });
});
