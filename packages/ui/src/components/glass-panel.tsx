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
        'premium-frame rounded-[22px] p-5 backdrop-blur-xl',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
