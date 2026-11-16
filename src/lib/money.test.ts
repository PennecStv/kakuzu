import { describe, expect, it } from 'vitest';
import { currencySymbol, formatMoney, formatSigned, parseAmount, toInput } from './money';

// Intl uses narrow no-break spaces in fr-FR; normalise them to compare.
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

describe('parseAmount', () => {
  it('reads decimal commas and dots', () => {
    expect(parseAmount('12,5', 'EUR')).toBe(1250);
    expect(parseAmount('12.50', 'EUR')).toBe(1250);
    expect(parseAmount(',5', 'EUR')).toBe(50);
  });

  it('ignores spaces and currency signs', () => {
    expect(parseAmount('1 234,56 €', 'EUR')).toBe(123456);
  });

  it('rounds float noise to the cent', () => {
    expect(parseAmount('0,1', 'EUR')).toBe(10);
    expect(parseAmount('19.99', 'EUR')).toBe(1999);
  });

  it('rejects more decimals than the currency has', () => {
    expect(parseAmount('1,005', 'EUR')).toBeNull();
    expect(parseAmount('12,5', 'JPY')).toBeNull();
  });

  it('rejects absurd amounts', () => {
    expect(parseAmount('99999999999999999999', 'EUR')).toBeNull();
  });

  it('rejects zero, negatives and garbage', () => {
    expect(parseAmount('0', 'EUR')).toBeNull();
    expect(parseAmount('-4', 'EUR')).toBeNull();
    expect(parseAmount('abc', 'EUR')).toBeNull();
    expect(parseAmount('', 'EUR')).toBeNull();
    expect(parseAmount('1,2,3', 'EUR')).toBeNull();
    expect(parseAmount('.', 'EUR')).toBeNull();
  });

  it('stores hundredths whatever the currency', () => {
    expect(parseAmount('1500', 'JPY')).toBe(150000);
  });
});

describe('formatting', () => {
  it('formats minor units in French', () => {
    expect(plain(formatMoney(123456, 'EUR'))).toBe('1 234,56 €');
    expect(plain(formatMoney(150000, 'JPY'))).toBe('1 500 JPY');
  });

  it('only changes the symbol when the currency changes', () => {
    expect(plain(formatMoney(1250, 'EUR'))).toBe('12,50 €');
    expect(plain(formatMoney(1250, 'USD'))).toBe('12,50 $US');
  });

  it('signs balances with a real minus', () => {
    expect(plain(formatSigned(-500, 'EUR'))).toBe('−5,00 €');
    expect(plain(formatSigned(500, 'EUR'))).toBe('+5,00 €');
    expect(plain(formatSigned(0, 'EUR'))).toBe('0,00 €');
  });

  it('gives the short symbol for input fields', () => {
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('USD')).toBe('$');
  });

  it('round-trips through the input format', () => {
    expect(toInput(1250, 'EUR')).toBe('12,50');
    expect(toInput(1200, 'EUR')).toBe('12');
    expect(parseAmount(toInput(1999, 'EUR'), 'EUR')).toBe(1999);
  });
});
