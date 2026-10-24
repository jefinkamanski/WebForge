import type { ZodError } from 'zod';

// "navItems.0.label" -> primeira mensagem de erro daquele campo
export function issuesToFieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    errors[key] ??= issue.message;
  }
  return errors;
}

// Erros de campo devolvidos pela API (só nível superior) -> primeira mensagem de cada um
export function apiFieldErrors(fields: Record<string, string[]>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fields).flatMap(([key, messages]) => (messages[0] ? [[key, messages[0]]] : [])),
  );
}
