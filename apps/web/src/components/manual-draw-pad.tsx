import { useEffect, useMemo, useState } from 'react';
import type { BingoLetter, DrawEventDto } from '@bingo/contracts';
import { Button, GlassPanel } from '@bingo/ui';
import { BINGO_DRAW_RANGES, drawRangeLabel, inferLetterFromValue } from '@/lib/draw-entry';

interface ManualDrawPadProps {
  currentDraw?: DrawEventDto;
  disabled?: boolean;
  onSubmit: (payload: { letter: BingoLetter; value: number }) => Promise<void>;
  onCorrectLast: (payload: { letter: BingoLetter; value: number }) => Promise<void>;
  onRevertLast: () => Promise<void>;
}

export function ManualDrawPad({
  currentDraw,
  disabled,
  onSubmit,
  onCorrectLast,
  onRevertLast,
}: ManualDrawPadProps) {
  const [letter, setLetter] = useState<BingoLetter>('G');
  const [value, setValue] = useState('52');
  const [busy, setBusy] = useState(false);

  async function withBusy(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  }

  const parsedValue = Number(value);
  const autoLetter = inferLetterFromValue(parsedValue);
  const effectiveLetter = autoLetter ?? letter;
  const numberReady = Number.isInteger(parsedValue) && parsedValue >= 1 && parsedValue <= 75;
  const currentRangeLabel = useMemo(() => drawRangeLabel(effectiveLetter), [effectiveLetter]);

  useEffect(() => {
    if (autoLetter && autoLetter !== letter) {
      setLetter(autoLetter);
    }
  }, [autoLetter, letter]);

  return (
    <GlassPanel className="space-y-4 rounded-[22px] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="premium-label m-0">Sorteio manual</p>
          <h3 className="m-0 mt-2 font-display text-2xl text-[var(--text-color)]">
            Registrar bola do globo
          </h3>
        </div>
        <div className="rounded-[16px] border border-[var(--border-color)] bg-white/5 px-4 py-3 text-right">
          <p className="m-0 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--muted-text)]">
            Ultimo sorteio
          </p>
          <p className="m-0 mt-1 font-display text-2xl font-bold text-[var(--gold)]">
            {currentDraw?.display ?? '--'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {BINGO_DRAW_RANGES.map((option) => (
          <button
            key={option.letter}
            type="button"
            className={`bingo-letter-chip ${letterToneClass(option.letter)} flex min-h-[4rem] items-center justify-center rounded-[14px] font-display text-3xl font-black text-white transition hover:-translate-y-0.5 ${
              effectiveLetter === option.letter ? 'ring-2 ring-[var(--gold)]/70' : ''
            }`}
            onClick={() => {
              setLetter(option.letter);
              if (!autoLetter || autoLetter !== option.letter) {
                setValue(String(option.min));
              }
            }}
          >
            {option.letter}
          </button>
        ))}
      </div>

      <div className="rounded-[18px] border border-white/12 bg-[linear-gradient(180deg,rgba(3,12,17,0.98),rgba(2,7,11,0.98))] p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem]">
          <label className="block">
            <span className="sr-only">Numero sorteado</span>
            <input
              type="number"
              min={1}
              max={75}
              inputMode="numeric"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="h-28 w-full rounded-[16px] border border-[var(--border-color)] bg-[#03090d] px-4 text-center font-display text-7xl font-black text-white outline-none focus:border-[var(--gold)]"
            />
          </label>
          <div className="flex flex-col justify-center rounded-[16px] border border-emerald-300/20 bg-emerald-300/10 px-4 text-center">
            <p className="m-0 text-[0.62rem] uppercase tracking-[0.18em] text-emerald-100/80">
              Letra
            </p>
            <p className="m-0 mt-1 font-display text-5xl font-black text-gradient">
              {effectiveLetter}
            </p>
            <p className="m-0 mt-1 text-xs text-[var(--muted-text)]">{currentRangeLabel}</p>
          </div>
        </div>
      </div>

      <Button
        className="min-h-[4rem] w-full gap-2 text-base"
        disabled={busy || disabled || !numberReady || !autoLetter}
        onClick={() => withBusy(() => onSubmit({ letter: effectiveLetter, value: parsedValue }))}
      >
        Registrar sorteio
      </Button>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant="secondary"
          className="min-h-[3.5rem]"
          disabled={busy || !currentDraw || !numberReady || !autoLetter}
          onClick={() =>
            withBusy(() => onCorrectLast({ letter: effectiveLetter, value: parsedValue }))
          }
        >
          Corrigir ultimo
        </Button>
        <Button
          variant="ghost"
          className="min-h-[3.5rem]"
          disabled={busy || !currentDraw}
          onClick={() => withBusy(onRevertLast)}
        >
          Reverter ultimo
        </Button>
      </div>

      {!numberReady ? (
        <p className="m-0 rounded-[14px] border border-rose-200/15 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          Digite um numero entre 1 e 75 para liberar o registro.
        </p>
      ) : null}
    </GlassPanel>
  );
}

function letterToneClass(letter: BingoLetter) {
  const tones: Record<BingoLetter, string> = {
    B: 'bingo-letter-b',
    I: 'bingo-letter-i',
    N: 'bingo-letter-n',
    G: 'bingo-letter-g',
    O: 'bingo-letter-o',
  };

  return tones[letter];
}
