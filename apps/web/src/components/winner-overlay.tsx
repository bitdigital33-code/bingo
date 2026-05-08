import { AnimatePresence, motion } from 'framer-motion';
import type { WinnerResult } from '@bingo/contracts';
import { formatDisplay } from '@/lib/format';

interface WinnerOverlayProps {
  winner?: WinnerResult;
  currentDraw?: string;
}

export function WinnerOverlay({ winner, currentDraw }: WinnerOverlayProps) {
  return (
    <AnimatePresence>
      {winner ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(255,208,103,0.16),rgba(3,8,11,0.76)_55%)] p-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="max-w-2xl rounded-[38px] border border-white/10 bg-[rgba(6,15,22,0.94)] p-8 text-center shadow-[0_40px_120px_rgba(0,0,0,0.48)]"
          >
            <p className="m-0 text-[0.72rem] uppercase tracking-[0.3em] text-amber-200/75">
              Campeao confirmado
            </p>
            <h2 className="m-0 mt-4 font-display text-4xl text-gradient">Bingo confirmado!</h2>
            <p className="m-0 mt-4 text-lg text-[var(--text-color)]">
              {winner.winners.map((entry) => entry.playerName).join(', ')} venceu a rodada.
            </p>
            <p className="m-0 mt-2 text-sm text-[var(--muted-text)]">
              Padrao: {winner.pattern} · Sorteio disparador: {formatDisplay(currentDraw)}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
