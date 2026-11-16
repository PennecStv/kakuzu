import { describe, expect, it } from 'vitest';
import { bitmapPath } from './pixels';

describe('bitmapPath', () => {
  it('draws one rectangle per run, offset by dx and dy', () => {
    expect(bitmapPath(['#.##', '....', '.#..'], 2, 1)).toBe('M2 1h1v1h-1zM4 1h2v1h-2zM3 3h1v1h-1z');
  });

  it('draws nothing for an empty bitmap', () => {
    expect(bitmapPath(['...', ''])).toBe('');
  });
});
