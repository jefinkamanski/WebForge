import type { ReactNode } from 'react';

export type AlertTone = 'error' | 'success' | 'info';

const tones: Record<AlertTone, string> = {
  error: 'bg-red-50 text-red-800 ring-red-200',
  success: 'bg-green-50 text-green-800 ring-green-200',
  info: 'bg-sky-50 text-sky-900 ring-sky-200',
};

export interface AlertProps {
  tone?: AlertTone;
  children: ReactNode;
}

export function Alert({ tone = 'info', children }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-md px-4 py-3 text-sm ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </div>
  );
}
