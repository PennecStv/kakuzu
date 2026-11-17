import { describe, expect, it } from 'vitest';
import { decodeCsv, parseCsv } from './csv';

describe('parseCsv', () => {
  it('guesses the separator and keeps quoted separators, quotes and line breaks', () => {
    expect(parseCsv('Date;Note\r\n2026-11-01;"a;b ""c""\nd"\r\n')).toEqual([
      ['Date', 'Note'],
      ['2026-11-01', 'a;b "c"\nd'],
    ]);
    expect(parseCsv('Date,Montant\n2026-11-01,"12,50"')).toEqual([
      ['Date', 'Montant'],
      ['2026-11-01', '12,50'],
    ]);
  });
});

describe('decodeCsv', () => {
  it('reads UTF-8 with its BOM, else Windows-1252', () => {
    expect(decodeCsv(new TextEncoder().encode('﻿Catégorie').buffer)).toBe('Catégorie');
    expect(decodeCsv(new Uint8Array([0x43, 0x61, 0x74, 0xe9]).buffer)).toBe('Caté');
  });
});
