import type { BingoLetter } from '@bingo/contracts';

export const BINGO_DRAW_RANGES: Array<{
  letter: BingoLetter;
  min: number;
  max: number;
}> = [
  { letter: 'B', min: 1, max: 15 },
  { letter: 'I', min: 16, max: 30 },
  { letter: 'N', min: 31, max: 45 },
  { letter: 'G', min: 46, max: 60 },
  { letter: 'O', min: 61, max: 75 },
];

export function inferLetterFromValue(value: number): BingoLetter | undefined {
  return BINGO_DRAW_RANGES.find((range) => value >= range.min && value <= range.max)?.letter;
}

export function drawRangeLabel(letter: BingoLetter) {
  const range = BINGO_DRAW_RANGES.find((entry) => entry.letter === letter);
  return range ? `${range.min}-${range.max}` : '--';
}
