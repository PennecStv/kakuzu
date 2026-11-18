import { describe, expect, it } from 'vitest';
import type { Goal } from '../store/types';
import { deadlineLabel, urgency } from './goals';

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
