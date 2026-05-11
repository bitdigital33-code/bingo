import { useEffect, useMemo, useState } from 'react';
import type { BingoLetter, DrawEventDto } from '@bingo/contracts';
import { Button, GlassPanel, ToggleChip } from '@bingo/ui';
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
    <GlassPanel className="space-y-5 rounded-[34px] border-white/6 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="m-0 text-[0.72rem] uppercase tracking-[0.28em] text-[var(--muted-text)]">
            Comando da rodada
          </p>
          <h3 className="m-0 mt-2 font-display text-2xl text-[var(--text-color)]">
            Registro manual do globo fisico
          </h3>
          <p className="m-0 mt-2 text-sm text-[var(--muted-text)]">
            Digite o numero e a letra correta entra sozinha pela faixa oficial do bingo.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-3">
            <p className="m-0 text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted-text)]">
              Letra ativa
            </p>
            <p className="m-0 mt-2 font-display text-3xl text-gradient">{effectiveLetter}</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-3">
            <p className="m-0 text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted-text)]">
              Faixa
            </p>
            <p className="m-0 mt-2 text-lg font-semibold text-[var(--text-color)]">{currentRangeLabel}</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-3">
            <p className="m-0 text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted-text)]">
              Ultimo
            </p>
            <p className="m-0 mt-2 text-lg font-semibold text-[var(--text-color)]">
              {currentDraw?.display ?? '--'}
            </p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/5 px-4 py-3">
            <p className="m-0 text-[0.65rem] uppercase tracking-[0.18em] text-[var(--muted-text)]">
              Status
            </p>
            <p className="m-0 mt-2 text-lg font-semibold text-[var(--text-color)]">
              {disabled ? 'Travado' : 'Pronto'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-5">
        {BINGO_DRAW_RANGES.map((option) => (
          <ToggleChip
            key={option.letter}
            active={effectiveLetter === option.letter}
            className="flex flex-col gap-1 rounded-[24px] px-4 py-3 text-left text-base normal-case"
            onClick={() => {
              setLetter(option.letter);
              if (!autoLetter || autoLetter !== option.letter) {
                setValue(String(option.min));
              }
            }}
          >
            <span className="font-display text-2xl">{option.letter}</span>
            <span className="text-[0.68rem] uppercase tracking-[0.18em] opacity-70">
              {option.min}-{option.max}
            </span>
          </ToggleChip>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="m-0 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--muted-text)]">
                Numero sorteado
              </p>
              <p className="m-0 mt-2 text-sm text-[var(--muted-text)]">
                O sistema confere a faixa e arma a letra antes de registrar.
              </p>
            </div>
            <div className="rounded-[24px] border border-emerald-200/15 bg-emerald-300/10 px-4 py-3 text-center">
              <p className="m-0 text-[0.62rem] uppercase tracking-[0.18em] text-emerald-100/80">
                Letra pronta
              </p>
              <p className="m-0 mt-1 font-display text-4xl text-gradient">{effectiveLetter}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="number"
              min={1}
              max={75}
              inputMode="numeric"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="w-full rounded-[24px] border border-white/10 bg-[var(--surface-strong)] px-5 py-5 text-[clamp(2.2rem,5vw,3.2rem)] font-black text-[var(--text-color)] outline-none"
            />
            <div className="rounded-[24px] border border-white/8 bg-white/5 px-5 py-4 text-right">
              <p className="m-0 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--muted-text)]">
                Faixa valida
              </p>
              <p className="m-0 mt-2 text-2xl font-semibold text-[var(--text-color)]">{currentRangeLabel}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted-text)]">
            <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5">
              B: 1-15
            </span>
            <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5">
              I: 16-30
            </span>
            <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5">
              N: 31-45
            </span>
            <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5">
              G: 46-60
            </span>
            <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5">
              O: 61-75
            </span>
          </div>
        </div>

        <div className="grid gap-3">
          <Button
            className="min-h-[4.6rem] text-base"
            disabled={busy || disabled || !numberReady || !autoLetter}
            onClick={() => withBusy(() => onSubmit({ letter: effectiveLetter, value: parsedValue }))}
          >
            Registrar sorteio
          </Button>
          <Button
            variant="secondary"
            className="min-h-[4rem] text-sm"
            disabled={busy || !currentDraw || !numberReady || !autoLetter}
            onClick={() =>
              withBusy(() => onCorrectLast({ letter: effectiveLetter, value: parsedValue }))
            }
          >
            Corrigir ultimo
          </Button>
          <Button
            variant="ghost"
            className="min-h-[4rem] text-sm"
            disabled={busy || !currentDraw}
            onClick={() => withBusy(onRevertLast)}
          >
            Reverter ultimo
          </Button>
          {!numberReady ? (
            <p className="m-0 rounded-[22px] border border-rose-200/15 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              Digite um numero entre 1 e 75 para liberar o registro.
            </p>
          ) : null}
        </div>
      </div>
    </GlassPanel>
  );
}
