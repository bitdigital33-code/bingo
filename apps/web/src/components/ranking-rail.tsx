import type { ProximityEntry } from '@bingo/contracts';
import { GlassPanel } from '@bingo/ui';

export function RankingRail({ entries }: { entries: ProximityEntry[] }) {
  return (
    <GlassPanel className="rounded-[22px] p-5">
      <p className="premium-label m-0">Ranking</p>
      <div className="mt-4 space-y-3">
        {entries.map((entry, index) => (
          <div
            key={entry.playerSessionId}
            className="flex items-center justify-between gap-3 rounded-[16px] border border-[var(--border-color)] bg-white/5 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--gold)]/30 bg-white/10 text-sm font-black text-[var(--gold)]">
                {index + 1}
              </div>
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-bold text-[var(--text-color)]">{entry.playerName}</p>
                <p className="m-0 text-xs text-[var(--muted-text)]">
                  {entry.cardsNearWin} cartela(s) aquecida(s)
                </p>
              </div>
            </div>
            <div className="shrink-0 rounded-[12px] border border-[var(--border-color)] bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">
              {entry.distance === 0 ? 'Bingo' : `${entry.distance} faltam`}
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
