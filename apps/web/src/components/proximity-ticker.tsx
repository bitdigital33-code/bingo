import { motion } from 'framer-motion';
import type { ProximityEntry } from '@bingo/contracts';
import { Button, GlassPanel } from '@bingo/ui';

export function ProximityTicker({
  entries,
  onBroadcastAlert,
}: {
  entries: ProximityEntry[];
  onBroadcastAlert?: (entry: ProximityEntry) => void;
}) {
  return (
    <GlassPanel className="rounded-[22px] p-4">
      <p className="premium-label m-0">Na boa</p>
      <div className="mt-4 space-y-3">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.playerSessionId}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, delay: index * 0.04 }}
            className="rounded-[16px] border border-[var(--border-color)] bg-white/5 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gold)]/30 bg-[linear-gradient(180deg,rgba(228,180,95,0.32),rgba(77,50,12,0.78))] text-sm font-black text-white">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-sm font-bold text-[var(--text-color)]">
                  {nearWinTitle(entry)}
                </p>
                <p className="m-0 text-xs text-[var(--muted-text)]">
                  {entry.message}
                </p>
              </div>
              {onBroadcastAlert &&
              (entry.distance <= 2 || entry.cardsNearWin > 0) ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="px-3 py-2 text-xs"
                  onClick={() => onBroadcastAlert(entry)}
                >
                  Mostrar
                </Button>
              ) : null}
            </div>
          </motion.div>
        ))}
      </div>
    </GlassPanel>
  );
}

function nearWinTitle(entry: ProximityEntry) {
  const count = Math.max(entry.cardsNearWin, 1);
  if (entry.distance === 0) {
    return count === 1 ? '1 cartela bateu' : `${count} cartelas bateram`;
  }
  if (entry.distance <= 2 || entry.cardsNearWin > 0) {
    return count === 1 ? '1 cartela na boa' : `${count} cartelas na boa`;
  }
  return 'Cartela observada';
}
