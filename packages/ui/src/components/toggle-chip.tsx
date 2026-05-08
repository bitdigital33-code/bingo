import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../lib/cn';

interface ToggleChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function ToggleChip({
  active,
  children,
  className,
  ...props
}: PropsWithChildren<ToggleChipProps>) {
  return (
    <button
      className={cn(
        'rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] transition duration-200',
        active
          ? 'border-transparent bg-white text-slate-950 shadow-[0_10px_30px_rgba(255,255,255,0.18)]'
          : 'border-white/10 bg-white/5 text-[var(--muted-text)] hover:border-white/30',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
