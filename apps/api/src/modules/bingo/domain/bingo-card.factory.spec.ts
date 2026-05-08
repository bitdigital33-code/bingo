import { BingoCardFactory } from './bingo-card.factory';

describe('BingoCardFactory', () => {
  it('gera cartelas unicas com ranges validos', () => {
    const factory = new BingoCardFactory();
    const cards = factory.generateCards(3, new Set());

    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((card) => card.serial)).size).toBe(3);

    for (const card of cards) {
      const flat = card.cells.flat();
      flat.forEach((cell) => {
        if (cell.value === 'FREE') {
          expect(cell.row).toBe(2);
          expect(cell.col).toBe(2);
          return;
        }

        if (cell.letter === 'B') expect(cell.value).toBeGreaterThanOrEqual(1);
        if (cell.letter === 'B') expect(cell.value).toBeLessThanOrEqual(15);
        if (cell.letter === 'I') expect(cell.value).toBeGreaterThanOrEqual(16);
        if (cell.letter === 'I') expect(cell.value).toBeLessThanOrEqual(30);
        if (cell.letter === 'N') expect(cell.value).toBeGreaterThanOrEqual(31);
        if (cell.letter === 'N') expect(cell.value).toBeLessThanOrEqual(45);
        if (cell.letter === 'G') expect(cell.value).toBeGreaterThanOrEqual(46);
        if (cell.letter === 'G') expect(cell.value).toBeLessThanOrEqual(60);
        if (cell.letter === 'O') expect(cell.value).toBeGreaterThanOrEqual(61);
        if (cell.letter === 'O') expect(cell.value).toBeLessThanOrEqual(75);
      });
    }
  });
});
