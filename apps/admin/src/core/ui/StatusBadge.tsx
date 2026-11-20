import type { ReactNode } from 'react';
import { Badge } from '../components/ui/badge.tsx';
import { cn } from '../lib/utils.ts';

export type StatusTone = 'success' | 'warning' | 'info' | 'error' | 'primary' | 'neutral';

// Fundo da cor de destaque a 12% + texto na cor de texto do status
const tones: Record<StatusTone, string> = {
  success: 'bg-success/12 text-success-foreground',
  warning: 'bg-warning/12 text-warning-foreground',
  info: 'bg-info/12 text-info-foreground',
  error: 'bg-error/12 text-error-foreground',
  primary: 'bg-primary/12 text-secondary-foreground',
  neutral: 'bg-muted text-muted-foreground',
};

export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <Badge variant="outline" className={cn('border-transparent px-2 py-1', tones[tone])}>
      {children}
    </Badge>
  );
}
