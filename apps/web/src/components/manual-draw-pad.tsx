import { useState } from 'react';
import type { BingoLetter, DrawEventDto } from '@bingo/contracts';
import { Button, GlassPanel, ToggleChip } from '@bingo/ui';

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

  return (
    <GlassPanel className="space-y-5 rounded-[34px] p-6">
      <div>
        <p className="m-0 text-[0.72rem] uppercase tracking-[0.28em] text-[var(--muted-text)]">
          Controle do anfitriao
        </p>
        <h3 className="m-0 mt-2 font-display text-2xl text-[var(--text-color)]">
          Registro manual do globo fisico
        </h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['B', 'I', 'N', 'G', 'O'] as const).map((option) => (
          <ToggleChip
            key={option}
            active={letter === option}
            className="px-5 py-3 text-base"
            onClick={() => setLetter(option)}
          >
            {option}
          </ToggleChip>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <p className="m-0 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--muted-text)]">
            Numero sorteado
          </p>
          <div className="mt-3 flex items-center gap-4">
            <span className="font-display text-4xl font-bold text-[var(--text-color)]">{letter}</span>
            <input
              type="number"
              min={1}
              max={75}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[var(--surface-strong)] px-4 py-4 text-2xl font-bold text-[var(--text-color)] outline-none"
            />
          </div>
        </div>
        <div className="grid gap-3">
          <Button
            className="h-full min-h-[4.25rem] text-base"
            disabled={busy || disabled || !Number.isFinite(parsedValue)}
            onClick={() => withBusy(() => onSubmit({ letter, value: parsedValue }))}
          >
            Registrar sorteio
          </Button>
          <Button
            variant="secondary"
            className="text-sm"
            disabled={busy || !currentDraw}
            onClick={() => withBusy(() => onCorrectLast({ letter, value: parsedValue }))}
          >
            Corrigir ultimo
          </Button>
          <Button
            variant="ghost"
            className="text-sm"
            disabled={busy || !currentDraw}
            onClick={() => withBusy(onRevertLast)}
          >
            Reverter ultimo
          </Button>
        </div>
      </div>
    </GlassPanel>
  );
}
