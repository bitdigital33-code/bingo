import { describe, expect, it } from 'vitest';
import { formatDisplay } from './format';

describe('formatDisplay', () => {
  it('separa letra e numero', () => {
    expect(formatDisplay('G52')).toBe('G 52');
    expect(formatDisplay(undefined)).toBe('--');
  });
});
