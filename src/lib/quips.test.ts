import { describe, expect, it } from 'vitest';
import { QUIPS, QUIP_LINE_MAX, pickQuip } from './quips';

describe('quips', () => {
  it('fit a phone line by line', () => {
    const lines = [...QUIPS.income, ...QUIPS.expense].flatMap((q) => q.split('\n'));
    expect(lines.filter((l) => l.length > QUIP_LINE_MAX)).toEqual([]);
  });

  it('never repeat the previous line', () => {
    const first = QUIPS.expense[0];
    // random() = 0 would pick the first line again if it were still in the pool.
    expect(pickQuip('expense', first, () => 0)).not.toBe(first);
  });

  it('pick from the list of the kind', () => {
    expect(QUIPS.income).toContain(pickQuip('income', undefined, () => 0.99));
  });
});
