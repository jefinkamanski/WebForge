import { useId, type ReactNode } from 'react';
import { Label } from '../components/ui/label.tsx';

interface FieldIds {
  id: string;
  describedBy: string | undefined;
  invalid: true | undefined;
}

export interface FieldProps {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  // Recebe os ids para ligar rótulo, ajuda e erro ao controle
  children: (ids: FieldIds) => ReactNode;
}

// Rótulo + controle + ajuda + erro, no padrão do guia (docs/DESIGN-ADMIN.md)
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, describedBy: describedBy || undefined, invalid: error ? true : undefined })}
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-error-foreground text-xs font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
