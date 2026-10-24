import { useId, type TextareaHTMLAttributes } from 'react';

export interface TextAreaFieldProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id'
> {
  label: string;
  error?: string | undefined;
  hint?: string;
}

export function TextAreaField({ label, error, hint, className = '', ...rest }: TextAreaFieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`block w-full rounded-md border-0 px-3 py-2 text-sm text-slate-900 ring-1 ring-inset focus:ring-2 focus:ring-indigo-600 ${error ? 'ring-red-500' : 'ring-slate-300'} ${className}`}
        {...rest}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-slate-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
