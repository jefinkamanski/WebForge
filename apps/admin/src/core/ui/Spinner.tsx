import { LoaderCircleIcon } from 'lucide-react';
import { cn } from '../lib/utils.ts';

export interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className = 'size-6', label }: SpinnerProps) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center gap-2">
      <LoaderCircleIcon className={cn('animate-spin', className)} aria-hidden="true" />
      {label && <span className="text-muted-foreground text-sm">{label}</span>}
    </span>
  );
}
