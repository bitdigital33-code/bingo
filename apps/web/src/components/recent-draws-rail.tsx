import type { DrawEventDto } from '@bingo/contracts';
import { formatDisplay } from '@/lib/format';

export function RecentDrawsRail({ draws }: { draws: DrawEventDto[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 soft-scrollbar">
      {draws.map((draw) => (
        <div
          key={draw.id}
          className="min-w-[5.5rem] rounded-[22px] border border-white/8 bg-white/6 px-4 py-3 text-center"
        >
          <p className="m-0 font-display text-xl font-bold text-[var(--text-color)]">
            {formatDisplay(draw.display)}
          </p>
          <p className="m-0 text-[0.62rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
            {draw.type}
          </p>
        </div>
      ))}
    </div>
  );
}
