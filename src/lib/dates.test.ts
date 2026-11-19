import { describe, expect, it } from 'vitest';
import { dateFieldLabel, dayLabel, daysBetween, fullDay, lastMonth, monthGrid, monthLabel, monthOf, periodLabel, shortDay, shiftMonth, shiftPeriod, unitOf, withUnit } from './dates';

describe('periods', () => {
  it('reads the unit from the length', () => {
    expect(unitOf('2026')).toBe('year');
    expect(unitOf('2026-11')).toBe('month');
    expect(unitOf('2026-11-17')).toBe('day');
  });

  it('shifts by its own unit', () => {
    expect(shiftPeriod('2026', -1)).toBe('2025');
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12');
    expect(shiftPeriod('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftPeriod('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('changes unit around today when the period holds it, else around its start', () => {
    const now = '2026-11-17';
    expect(withUnit('2026', 'day', now)).toBe('2026-11-17');
    expect(withUnit('2026-11', 'year', now)).toBe('2026');
    expect(withUnit('2025', 'month', now)).toBe('2025-01');
    expect(withUnit('2025-06', 'day', now)).toBe('2025-06-01');
    expect(withUnit('2025-06-14', 'month', now)).toBe('2025-06');
  });

  it('ends a trend on the last month, never past today', () => {
    const now = '2026-11-17';
    expect(lastMonth('2025', now)).toBe('2025-12');
    expect(lastMonth('2026', now)).toBe('2026-11');
    expect(lastMonth('2025-03-04', now)).toBe('2025-03');
  });

  it('labels each unit', () => {
    expect(periodLabel('2026')).toBe('2026');
    expect(periodLabel('2026-11')).toBe('novembre 2026');
    expect(periodLabel('2026-11-16', '2026-11-16')).toBe("Aujourd'hui");
  });
});

describe('months', () => {
  it('shifts across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-05', 0)).toBe('2026-05');
  });

  it('extracts and labels a month', () => {
    expect(monthOf('2026-11-16')).toBe('2026-11');
    expect(monthLabel('2026-11')).toBe('novembre 2026');
  });
});

describe('dayLabel', () => {
  it('names today and yesterday', () => {
    expect(dayLabel('2026-11-16', '2026-11-16')).toBe("Aujourd'hui");
    expect(dayLabel('2026-11-15', '2026-11-16')).toBe('Hier');
    expect(dayLabel('2026-02-28', '2026-03-01')).toBe('Hier');
  });

  it('spells out older days', () => {
    expect(dayLabel('2026-11-10', '2026-11-16')).toBe('Mardi 10 novembre');
  });
});

describe('days', () => {
  it('counts whole days, across a daylight saving change', () => {
    expect(daysBetween('2026-11-18', '2026-11-25')).toBe(7);
    expect(daysBetween('2026-11-18', '2026-11-17')).toBe(-1);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('gives a short date, with the year only when it differs', () => {
    expect(shortDay('2026-12-31', '2026-11-18')).toBe('31 déc.');
    expect(shortDay('2027-01-15', '2026-11-18')).toBe('15 janv. 2027');
  });
});

describe('calendar', () => {
  it('lays a month out from Monday, in six weeks', () => {
    // 1 November 2026 is a Sunday.
    const grid = monthGrid('2026-11');
    expect(grid).toHaveLength(42);
    expect(grid.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(grid[35]).toBe('2026-11-30');
    expect(grid.slice(36).every((d) => d === null)).toBe(true);
  });

  it('starts on the first cell when the 1st is a Monday', () => {
    const grid = monthGrid('2027-02');
    expect(grid[0]).toBe('2027-02-01');
    expect(grid.filter(Boolean)).toHaveLength(28);
  });

  it('names a day in full for a screen reader', () => {
    expect(fullDay('2026-11-19')).toBe('jeudi 19 novembre 2026');
  });

  it('shows today by name in a date field', () => {
    expect(dateFieldLabel('2026-11-19', '2026-11-19')).toBe("Aujourd'hui");
    expect(dateFieldLabel('2026-11-18', '2026-11-19')).toBe('18 nov.');
  });
});
