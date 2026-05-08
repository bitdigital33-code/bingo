import { motion } from 'framer-motion';
import type { ProximityEntry } from '@bingo/contracts';
import { GlassPanel } from '@bingo/ui';

export function ProximityTicker({ entries }: { entries: ProximityEntry[] }) {
  return (
    <GlassPanel className="rounded-[30px] p-4">
      <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
        Radar da boa
      </p>
      <div className="mt-4 space-y-3">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.playerSessionId}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, delay: index * 0.04 }}
            className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-lg">
                {entry.avatar}
              </div>
              <div>
                <p className="m-0 text-sm font-semibold text-[var(--text-color)]">{entry.playerName}</p>
                <p className="m-0 text-xs text-[var(--muted-text)]">{entry.message}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassPanel>
  );
}
