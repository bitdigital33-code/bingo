import { Injectable } from '@nestjs/common';
import type { BingoLetter } from '@bingo/contracts';
import { BINGO_RANGES, CARD_SIZE, FREE_CENTER } from './bingo-rules';
import { createId } from './create-id';
import type { StoredCard, StoredCardCell } from './internal-types';

@Injectable()
export class BingoCardFactory {
  generateCards(count: number, existingSerials: Set<string>) {
    const cards: StoredCard[] = [];

    while (cards.length < count) {
      const serial = this.createSerial(existingSerials);
      existingSerials.add(serial);

      cards.push({
        id: createId(),
        serial,
        cells: this.buildCells(),
      });
    }

    return cards;
  }

  private createSerial(existingSerials: Set<string>) {
    let serial = '';

    while (!serial || existingSerials.has(serial)) {
      serial = `BFP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    }

    return serial;
  }

  private buildCells() {
    const letters = ['B', 'I', 'N', 'G', 'O'] as const satisfies readonly BingoLetter[];
    const cells: StoredCardCell[][] = [];

    letters.forEach((letter, col) => {
      const pool = this.pickColumnValues(letter);
      pool.forEach((value, row) => {
        cells[row] ??= [];
        cells[row][col] = {
          letter,
          value,
          row,
          col,
        };
      });
    });

    cells[FREE_CENTER.row][FREE_CENTER.col] = {
      letter: 'N',
      value: 'FREE',
      row: FREE_CENTER.row,
      col: FREE_CENTER.col,
    };

    return cells;
  }

  private pickColumnValues(letter: BingoLetter) {
    const [min, max] = BINGO_RANGES[letter];
    const numbers = Array.from({ length: max - min + 1 }, (_, index) => min + index);

    for (let index = numbers.length - 1; index > 0; index -= 1) {
      const next = Math.floor(Math.random() * (index + 1));
      [numbers[index], numbers[next]] = [numbers[next], numbers[index]];
    }

    return numbers
      .slice(0, CARD_SIZE)
      .sort((left, right) => left - right);
  }
}
