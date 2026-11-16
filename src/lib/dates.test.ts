import { describe, expect, it } from 'vitest';
import { dayLabel, monthLabel, monthOf, shiftMonth } from './dates';

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
