import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../lib/cn';

export function SectionHeading({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)} {...props}>
      {children}
    </div>
  );
}
