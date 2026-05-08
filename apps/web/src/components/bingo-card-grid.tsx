import type { PlayerCardView } from '@bingo/contracts';
import { GlassPanel } from '@bingo/ui';

interface BingoCardGridProps {
  card: PlayerCardView;
  large?: boolean;
}

export function BingoCardGrid({ card, large }: BingoCardGridProps) {
  return (
    <GlassPanel className="space-y-4 rounded-[30px] p-4 md:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
            Cartela {card.serial}
          </p>
          <p className="m-0 mt-1 text-sm font-semibold text-[var(--text-color)]">
            {card.marksNeeded === 0
              ? 'Padrao completo'
              : `Faltam ${card.marksNeeded} numero(s)`}
          </p>
        </div>
        <div className="rounded-full bg-white/8 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-text)]">
          {card.autoMark ? 'Auto' : 'Manual'}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {['B', 'I', 'N', 'G', 'O'].map((letter) => (
          <div
            key={letter}
            className="rounded-2xl bg-white/8 py-3 text-center font-display text-sm font-bold tracking-[0.26em] text-[var(--text-color)]"
          >
            {letter}
          </div>
        ))}

        {card.cells.flat().map((cell) => (
          <div
            key={`${card.id}-${cell.row}-${cell.col}`}
            className={`rounded-[22px] border px-1 py-4 text-center ${
              large ? 'min-h-[5.4rem] text-2xl' : 'min-h-[4.5rem] text-xl'
            } ${
              cell.marked
                ? 'border-transparent bg-[linear-gradient(135deg,rgba(255,122,89,0.85),rgba(89,255,208,0.85))] text-slate-950 shadow-[0_22px_40px_rgba(89,255,208,0.16)]'
                : 'border-white/10 bg-white/5 text-[var(--text-color)]'
            } flex items-center justify-center font-display font-bold`}
          >
            {cell.value}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
