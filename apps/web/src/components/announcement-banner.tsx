import { motion } from 'framer-motion';
import type { AnnouncementCue } from '@bingo/contracts';
import { GlassPanel } from '@bingo/ui';

interface AnnouncementBannerProps {
  cues: AnnouncementCue[];
}

export function AnnouncementBanner({ cues }: AnnouncementBannerProps) {
  if (cues.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {cues.map((cue, index) => (
        <motion.div
          key={cue.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.05 }}
        >
          <GlassPanel className="spot-grid flex items-center gap-3 rounded-3xl border-white/5 bg-white/6 px-4 py-3">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                cue.tone === 'winner'
                  ? 'bg-amber-300 shadow-[0_0_16px_rgba(255,208,103,0.9)]'
                  : cue.tone === 'warning'
                    ? 'bg-cyan-300 shadow-[0_0_16px_rgba(103,236,255,0.75)]'
                    : 'bg-[var(--accent)] shadow-[0_0_16px_rgba(255,122,89,0.75)]'
              }`}
            />
            <div>
              <p className="m-0 text-[0.68rem] uppercase tracking-[0.26em] text-[var(--muted-text)]">
                Animador Automatico
              </p>
              <p className="m-0 text-sm font-semibold text-[var(--text-color)]">{cue.message}</p>
            </div>
          </GlassPanel>
        </motion.div>
      ))}
    </div>
  );
}
