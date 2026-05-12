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
        'rounded-[14px] border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition duration-200',
        active
          ? 'border-[var(--gold)]/45 bg-[linear-gradient(180deg,rgba(228,180,95,0.25),rgba(24,58,32,0.7))] text-[var(--text-color)] shadow-[0_10px_26px_rgba(228,180,95,0.14)]'
          : 'border-[var(--border-color)] bg-white/5 text-[var(--muted-text)] hover:border-[var(--gold)]/45',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
