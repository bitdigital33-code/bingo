import { describe, expect, it } from 'vitest';
import { drawRangeLabel, inferLetterFromValue } from './draw-entry';

describe('draw entry helpers', () => {
  it('infere a letra correta pela faixa do numero', () => {
    expect(inferLetterFromValue(7)).toBe('B');
    expect(inferLetterFromValue(24)).toBe('I');
    expect(inferLetterFromValue(31)).toBe('N');
    expect(inferLetterFromValue(50)).toBe('G');
    expect(inferLetterFromValue(75)).toBe('O');
  });

  it('retorna undefined fora da faixa valida', () => {
    expect(inferLetterFromValue(0)).toBeUndefined();
    expect(inferLetterFromValue(90)).toBeUndefined();
  });

  it('formata a faixa visivel da letra', () => {
    expect(drawRangeLabel('B')).toBe('1-15');
    expect(drawRangeLabel('O')).toBe('61-75');
  });
});
