import { describe, expect, it } from 'vitest';
import type { BingoCellDto, PlayerCardView } from '@bingo/contracts';
import {
  buildCellKey,
  projectManualCard,
  seedManualMarksFromDraws,
} from './manual-card';

describe('manual card projection', () => {
  it('mantem apenas marcas manuais depois de sair do auto marcar', () => {
    const card = buildCard([
      [true, true, false, false, false],
      [false, false, false, false, false],
      [false, false, true, false, false],
      [false, false, false, false, false],
      [false, false, false, false, false],
    ]);

    const seeded = seedManualMarksFromDraws([card], {});
    expect(seeded[card.id]).toContain(buildCellKey(0, 0));
    expect(seeded[card.id]).toContain(buildCellKey(0, 1));

    const nextSnapshot = {
      ...card,
      cells: card.cells.map((row) =>
        row.map((cell) => ({
          ...cell,
          marked:
            cell.marked ||
            (cell.row === 0 && cell.col === 2),
        })),
      ),
    };

    const manualCard = projectManualCard(nextSnapshot, seeded[card.id], 'single_line');

    expect(manualCard.cells[0][0].marked).toBe(true);
    expect(manualCard.cells[0][1].marked).toBe(true);
    expect(manualCard.cells[0][2].marked).toBe(false);
    expect(manualCard.marksNeeded).toBe(3);
  });
});

function buildCard(marked: boolean[][]): PlayerCardView {
  return {
    id: 'card-1',
    playerSessionId: 'player-1',
    autoMark: true,
    serial: 'BFP-TESTE',
    marksNeeded: 0,
    cells: marked.map((row, rowIndex) =>
      row.map(
        (isMarked, colIndex) =>
          ({
            letter: ['B', 'I', 'N', 'G', 'O'][colIndex],
            value: rowIndex === 2 && colIndex === 2 ? 'FREE' : rowIndex * 5 + colIndex + 1,
            row: rowIndex,
            col: colIndex,
            marked: isMarked,
          }) as BingoCellDto,
      ),
    ),
  };
}
