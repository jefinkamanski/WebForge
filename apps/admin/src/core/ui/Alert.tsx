import { CircleAlertIcon, CircleCheckIcon, InfoIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/utils.ts';

export type AlertTone = 'error' | 'success' | 'info';

const tones: Record<AlertTone, { className: string; Icon: typeof InfoIcon }> = {
  error: { className: 'bg-error/12 text-error-foreground border-error/30', Icon: CircleAlertIcon },
  success: {
    className: 'bg-success/12 text-success-foreground border-success/40',
    Icon: CircleCheckIcon,
  },
  info: {
    className: 'bg-highlight/12 text-highlight-foreground border-highlight/40',
    Icon: InfoIcon,
  },
};

export interface AlertProps {
  tone?: AlertTone;
  children: ReactNode;
}

// Aviso dentro da página (erro de envio, confirmação de "salvo", orientação)
export function Alert({ tone = 'info', children }: AlertProps) {
  const { className, Icon } = tones[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
