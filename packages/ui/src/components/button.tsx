import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[linear-gradient(135deg,var(--accent),color-mix(in_srgb,var(--accent)_60%,white))] text-slate-950 shadow-[0_18px_50px_rgba(255,122,89,0.35)]',
  secondary:
    'bg-white/10 text-[var(--text-color)] border border-white/10 shadow-[0_16px_40px_rgba(5,12,17,0.25)]',
  ghost: 'bg-transparent text-[var(--muted-text)] border border-white/10',
};

export function Button({
  children,
  className,
  variant = 'primary',
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold tracking-[0.03em] transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
