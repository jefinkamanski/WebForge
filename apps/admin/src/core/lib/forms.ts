import type { ZodError } from 'zod';

// "items.0.label" -> primeira mensagem de erro daquele campo
export function issuesToFieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    errors[issue.path.join('.')] ??= issue.message;
  }
  return errors;
}
