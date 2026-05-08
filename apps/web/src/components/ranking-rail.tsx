import type { ProximityEntry } from '@bingo/contracts';
import { GlassPanel } from '@bingo/ui';

export function RankingRail({ entries }: { entries: ProximityEntry[] }) {
  return (
    <GlassPanel className="rounded-[30px] p-5">
      <p className="m-0 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--muted-text)]">
        Ranking dos mais proximos
      </p>
      <div className="mt-4 space-y-3">
        {entries.map((entry, index) => (
          <div
            key={entry.playerSessionId}
            className="flex items-center justify-between gap-3 rounded-[24px] border border-white/8 bg-white/5 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-[var(--text-color)]">
                {index + 1}
              </div>
              <div>
                <p className="m-0 text-sm font-semibold text-[var(--text-color)]">{entry.playerName}</p>
                <p className="m-0 text-xs text-[var(--muted-text)]">
                  {entry.cardsNearWin} cartela(s) aquecida(s)
                </p>
              </div>
            </div>
            <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-text)]">
              {entry.distance === 0 ? 'Bingo' : `${entry.distance} faltam`}
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
