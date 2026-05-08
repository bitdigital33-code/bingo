import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../lib/cn';

export function GlassPanel({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-white/10 bg-[var(--surface)] p-5 shadow-[0_30px_80px_rgba(4,10,16,0.38)] backdrop-blur-xl',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
