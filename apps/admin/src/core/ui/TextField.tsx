import type { InputHTMLAttributes } from 'react';
import { Input } from '../components/ui/input.tsx';
import { Field } from './Field.tsx';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string | undefined;
  hint?: string;
}

export function TextField({ label, error, hint, ...rest }: TextFieldProps) {
  return (
    <Field label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <Input id={id} aria-invalid={invalid} aria-describedby={describedBy} {...rest} />
      )}
    </Field>
  );
}
