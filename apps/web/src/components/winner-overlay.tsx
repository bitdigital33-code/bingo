import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { WinnerResult } from '@bingo/contracts';
import { Button } from '@bingo/ui';
import { formatDisplay } from '@/lib/format';

interface WinnerOverlayProps {
  winner?: WinnerResult;
  currentDraw?: string;
}

export function WinnerOverlay({ winner, currentDraw }: WinnerOverlayProps) {
  const winnerKey = useMemo(
    () => (winner ? `${winner.roundId}:${winner.triggeredByDrawId}` : undefined),
    [winner],
  );
  const [visibleWinnerKey, setVisibleWinnerKey] = useState<string>();
  const initializedRef = useRef(false);
  const lastWinnerKeyRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastWinnerKeyRef.current = winnerKey;
      return;
    }

    if (!winnerKey) {
      lastWinnerKeyRef.current = undefined;
      setVisibleWinnerKey(undefined);
      return;
    }

    if (lastWinnerKeyRef.current === winnerKey) {
      return;
    }

    lastWinnerKeyRef.current = winnerKey;
    setVisibleWinnerKey(winnerKey);
    const timer = window.setTimeout(() => setVisibleWinnerKey(undefined), 8000);
    return () => window.clearTimeout(timer);
  }, [winnerKey]);

  useEffect(() => {
    if (!visibleWinnerKey) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setVisibleWinnerKey(undefined);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [visibleWinnerKey]);

  const isVisible = Boolean(winner && visibleWinnerKey === winnerKey);
  const visibleWinner = isVisible ? winner : undefined;

  return (
    <AnimatePresence>
      {visibleWinner ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(255,208,103,0.16),rgba(3,8,11,0.76)_55%)] p-6"
          onClick={() => setVisibleWinnerKey(undefined)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="winner-overlay-title"
            className="max-w-2xl rounded-[38px] border border-white/10 bg-[rgba(6,15,22,0.94)] p-8 text-center shadow-[0_40px_120px_rgba(0,0,0,0.48)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="m-0 text-[0.72rem] uppercase tracking-[0.3em] text-amber-200/75">
              Campeao confirmado
            </p>
            <h2 id="winner-overlay-title" className="m-0 mt-4 font-display text-4xl text-gradient">
              Bingo confirmado!
            </h2>
            <p className="m-0 mt-4 text-lg text-[var(--text-color)]">
              {visibleWinner.winners.map((entry) => entry.playerName).join(', ')} venceu a rodada.
            </p>
            <p className="m-0 mt-2 text-sm text-[var(--muted-text)]">
              Padrao: {visibleWinner.pattern} - Sorteio disparador: {formatDisplay(currentDraw)}
            </p>
            <Button className="mt-6" variant="secondary" onClick={() => setVisibleWinnerKey(undefined)}>
              Fechar
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
