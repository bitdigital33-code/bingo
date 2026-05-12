import type { BingoCellDto, BingoLetter, PlayerCardView } from '@bingo/contracts';
import { GlassPanel } from '@bingo/ui';

interface BingoCardGridProps {
  card: PlayerCardView;
  large?: boolean;
  isCellToggleable?: (cell: BingoCellDto) => boolean;
  onCellToggle?: (cell: BingoCellDto) => void;
}

const LETTERS: BingoLetter[] = ['B', 'I', 'N', 'G', 'O'];

export function BingoCardGrid({
  card,
  isCellToggleable,
  large,
  onCellToggle,
}: BingoCardGridProps) {
  return (
    <GlassPanel className="space-y-4 rounded-[22px] p-4 md:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="premium-label m-0">Bingo Familiar Premium</p>
          <p className="m-0 mt-1 text-sm font-semibold text-[var(--text-color)]">
            Cartela {card.serial} -{' '}
            {card.marksNeeded === 0
              ? 'Padrao completo'
              : `faltam ${card.marksNeeded} numero(s)`}
          </p>
        </div>
        <div className="rounded-[14px] border border-[var(--border-color)] bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">
          {card.autoMark ? 'Auto' : 'Manual'}
        </div>
      </div>

      <div className="grid grid-cols-5 overflow-hidden rounded-[18px] border border-[var(--border-color)]">
        {LETTERS.map((letter) => (
          <div
            key={letter}
            className={`bingo-letter-chip bingo-letter-${letter.toLowerCase()} flex min-h-[3rem] items-center justify-center font-display text-2xl font-black text-white`}
          >
            {letter}
          </div>
        ))}

        {card.cells.flat().map((cell) => {
          const toggleable = Boolean(onCellToggle && isCellToggleable?.(cell));
          const className = `flex w-full items-center justify-center border-r border-b border-[rgba(228,180,95,0.18)] bg-[rgba(3,22,15,0.72)] px-1 text-center font-display font-black transition ${
            large ? 'min-h-[4.6rem] text-2xl' : 'min-h-[4rem] text-xl'
          } ${
            cell.marked
              ? `${markedToneClass(cell)} text-white`
              : 'text-[var(--text-color)]'
          } ${toggleable ? 'cursor-pointer hover:bg-white/10' : ''}`;

          if (!card.autoMark && onCellToggle) {
            return (
              <button
                key={`${card.id}-${cell.row}-${cell.col}`}
                type="button"
                className={className}
                disabled={!toggleable}
                aria-pressed={cell.marked}
                onClick={() => onCellToggle(cell)}
              >
                {cell.value}
              </button>
            );
          }

          return (
            <div key={`${card.id}-${cell.row}-${cell.col}`} className={className}>
              {cell.value}
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}

function markedToneClass(cell: BingoCellDto) {
  if (cell.value === 'FREE') {
    return 'bg-[radial-gradient(circle,rgba(228,180,95,0.76),rgba(101,71,14,0.65))] shadow-[inset_0_0_20px_rgba(228,180,95,0.35),0_0_20px_rgba(228,180,95,0.25)]';
  }

  if (cell.letter === 'G') {
    return 'bg-[rgba(200,108,255,0.16)] shadow-[inset_0_0_18px_rgba(200,108,255,0.4),0_0_18px_rgba(200,108,255,0.28)]';
  }

  if (cell.letter === 'N') {
    return 'bg-[rgba(105,242,131,0.16)] shadow-[inset_0_0_18px_rgba(105,242,131,0.38),0_0_18px_rgba(105,242,131,0.22)]';
  }

  if (cell.letter === 'I') {
    return 'bg-[rgba(228,180,95,0.16)] shadow-[inset_0_0_18px_rgba(228,180,95,0.38),0_0_18px_rgba(228,180,95,0.22)]';
  }

  return 'bg-[rgba(255,98,87,0.14)] shadow-[inset_0_0_18px_rgba(255,98,87,0.34),0_0_18px_rgba(255,98,87,0.2)]';
}
