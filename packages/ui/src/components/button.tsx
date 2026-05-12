import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../lib/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-[#ffb19f]/25 bg-[linear-gradient(180deg,#ff7665,#ed423a)] text-white shadow-[0_18px_42px_rgba(255,98,87,0.28)]',
  secondary:
    'border border-[var(--border-color)] bg-[linear-gradient(180deg,rgba(228,180,95,0.14),rgba(8,22,25,0.94))] text-[var(--text-color)] shadow-[0_16px_36px_rgba(0,0,0,0.24)]',
  ghost: 'bg-transparent text-[var(--muted-text)] border border-[var(--border-color)]',
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
        'inline-flex items-center justify-center rounded-[14px] px-5 py-3 text-sm font-bold tracking-[0.02em] transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
