import type { BingoCellDto, PlayerCardView, PrizePattern } from '@bingo/contracts';

export type ManualMarksState = Record<string, string[]>;

export function buildCellKey(row: number, col: number) {
  return `${row}:${col}`;
}

export function seedManualMarksFromDraws(cards: PlayerCardView[], current: ManualMarksState) {
  const next: ManualMarksState = { ...current };

  for (const card of cards) {
    const marks = new Set(next[card.id] ?? []);

    for (const cell of card.cells.flat()) {
      if (cell.marked && cell.value !== 'FREE') {
        marks.add(buildCellKey(cell.row, cell.col));
      }
    }

    next[card.id] = [...marks];
  }

  return next;
}

export function projectManualCard(
  card: PlayerCardView,
  manualMarks: string[] | undefined,
  activePattern: PrizePattern,
): PlayerCardView {
  const marks = new Set(manualMarks ?? []);
  const cells = card.cells.map((row) =>
    row.map((cell) => ({
      ...cell,
      marked:
        cell.value === 'FREE' ||
        (cell.marked && marks.has(buildCellKey(cell.row, cell.col))),
    })),
  );

  return {
    ...card,
    autoMark: false,
    cells,
    marksNeeded: countMissingForPattern(
      cells.map((row) => row.map((cell) => cell.marked)),
      activePattern,
    ),
  };
}

export function canToggleManualCell(cell: BingoCellDto) {
  return cell.value !== 'FREE' && cell.marked;
}

function countMissingForPattern(marks: boolean[][], pattern: PrizePattern) {
  if (pattern === 'full_house') {
    return marks.flat().filter((marked) => !marked).length;
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
        coords.add(buildCellKey(row, col));
      }

      for (const [row, col] of WIN_LINES[second]) {
        coords.add(buildCellKey(row, col));
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

const WIN_LINES = [
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
