import type { BingoLetter, PrizePattern } from '@bingo/contracts';

export const BINGO_RANGES: Record<BingoLetter, [number, number]> = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
};

export const CARD_SIZE = 5;
export const FREE_CENTER = { row: 2, col: 2 } as const;

export const WIN_LINES = [
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 2],
    [1, 3],
    [1, 4],
  ],
  [
    [2, 0],
    [2, 1],
    [2, 2],
    [2, 3],
    [2, 4],
  ],
  [
    [3, 0],
    [3, 1],
    [3, 2],
    [3, 3],
    [3, 4],
  ],
  [
    [4, 0],
    [4, 1],
    [4, 2],
    [4, 3],
    [4, 4],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
  ],
  [
    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
  ],
  [
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
    [4, 3],
  ],
  [
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
  ],
  [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
  ],
  [
    [0, 4],
    [1, 3],
    [2, 2],
    [3, 1],
    [4, 0],
  ],
] as const;

export function buildDrawDisplay(letter: BingoLetter, value: number) {
  return `${letter}${value}`;
}

export function isValidDraw(letter: BingoLetter, value: number) {
  const [min, max] = BINGO_RANGES[letter];
  return value >= min && value <= max;
}

export function countMissingForPattern(
  marks: boolean[][],
  pattern: PrizePattern,
  targetMarks?: number,
): number {
  if (pattern === 'marked_count') {
    const markedNumbers = marks.flatMap((row, rowIndex) =>
      row.map((marked, colIndex) =>
        rowIndex === FREE_CENTER.row && colIndex === FREE_CENTER.col ? false : marked,
      ),
    ).filter(Boolean).length;

    return Math.max((targetMarks ?? 3) - markedNumbers, 0);
  }

  if (pattern === 'full_house') {
    let missing = 0;
    for (const row of marks) {
      for (const marked of row) {
        if (!marked) {
          missing += 1;
        }
      }
    }
    return missing;
  }

  const lineMisses = WIN_LINES.map((line) =>
    line.reduce((count, [row, col]) => count + (marks[row][col] ? 0 : 1), 0),
  );

  if (pattern === 'single_line') {
    return Math.min(...lineMisses);
  }

  let best = Number.MAX_SAFE_INTEGER;

  for (let first = 0; first < WIN_LINES.length; first += 1) {
    for (let second = first + 1; second < WIN_LINES.length; second += 1) {
      const coords = new Set<string>();
      for (const [row, col] of WIN_LINES[first]) {
        coords.add(`${row}:${col}`);
      }
      for (const [row, col] of WIN_LINES[second]) {
        coords.add(`${row}:${col}`);
      }

      let missing = 0;
      for (const coord of coords) {
        const [row, col] = coord.split(':').map(Number);
        if (!marks[row][col]) {
          missing += 1;
        }
      }

      best = Math.min(best, missing);
    }
  }

  return best;
}
