import type { DrawEventDto } from '@bingo/contracts';
import { formatDisplay } from '@/lib/format';

export function RecentDrawsRail({ draws }: { draws: DrawEventDto[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 soft-scrollbar">
      {draws.map((draw) => {
        const [letter, number] = formatDisplay(draw.display).split(' ');

        return (
          <div
            key={draw.id}
            className="min-w-[6rem] rounded-[16px] border border-[var(--border-color)] bg-white/5 px-3 py-3"
          >
            <div className="flex items-center justify-center gap-2">
              <span className={`bingo-letter-chip bingo-letter-${letter.toLowerCase()} flex h-8 w-8 items-center justify-center rounded-[10px] text-sm font-black text-white`}>
                {letter}
              </span>
              <p className="m-0 font-display text-xl font-black text-[var(--text-color)]">
                {number}
              </p>
            </div>
            <p className="m-0 mt-2 text-center text-[0.62rem] uppercase tracking-[0.18em] text-[var(--muted-text)]">
              {draw.type}
            </p>
          </div>
        );
      })}
    </div>
  );
}
