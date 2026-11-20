import type { TextareaHTMLAttributes } from 'react';
import { Textarea } from '../components/ui/textarea.tsx';
import { Field } from './Field.tsx';

export interface TextAreaFieldProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id'
> {
  label: string;
  error?: string | undefined;
  hint?: string;
}

export function TextAreaField({ label, error, hint, rows = 3, ...rest }: TextAreaFieldProps) {
  return (
    <Field label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <Textarea
          id={id}
          rows={rows}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          {...rest}
        />
      )}
    </Field>
  );
}
