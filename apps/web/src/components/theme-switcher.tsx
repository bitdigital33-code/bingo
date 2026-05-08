import type { ThemeKey } from '@bingo/contracts';
import { GlassPanel } from '@bingo/ui';

interface ThemeSwitcherProps {
  theme: ThemeKey;
  onChange: (theme: ThemeKey) => void;
}

export function ThemeSwitcher({ theme, onChange }: ThemeSwitcherProps) {
  return (
    <GlassPanel className="rounded-[28px] p-4">
      <p className="m-0 text-[0.68rem] uppercase tracking-[0.22em] text-[var(--muted-text)]">
        Tema ao vivo
      </p>
      <select
        value={theme}
        onChange={(event) => onChange(event.target.value as ThemeKey)}
        className="mt-3 w-full rounded-2xl border border-white/10 bg-[var(--surface-strong)] px-4 py-3 text-sm font-semibold text-[var(--text-color)] outline-none"
      >
        <option value="cassino">Cassino</option>
        <option value="natal">Natal</option>
        <option value="neon">Neon</option>
        <option value="junina">Festa Junina</option>
        <option value="infantil">Infantil</option>
      </select>
    </GlassPanel>
  );
}
