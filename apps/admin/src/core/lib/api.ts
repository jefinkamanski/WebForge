import { redirect } from 'react-router';

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

// URLs de mídia vêm relativas à API (/uploads/...)
export const mediaUrl = (url: string) => `${API_URL}${url}`;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string[]>;
  readonly details: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    fields: Record<string, string[]> = {},
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.details = details;
  }
}

interface ErrorBody {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string[]>;
    details?: unknown;
  };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  json?: unknown;
  // Envio de arquivo (multipart); o navegador define o content-type
  form?: FormData;
  signal?: AbortSignal;
}

// Usado só em loaders/actions do React Router: sessão expirada (401) leva ao login
// e troca de senha pendente (403) leva à tela de troca.
export async function api<T>(
  path: string,
  { method = 'GET', json, form, signal }: RequestOptions = {},
) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      ...(signal && { signal }),
      ...(json !== undefined && {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(json),
      }),
      ...(form && { body: form }),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Não foi possível conectar ao servidor.');
  }

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);
  if (response.ok) return body as T;

  const { error } = (body ?? {}) as ErrorBody;
  if (response.status === 401 && path !== '/auth/login') throw redirect('/login');
  if (error?.code === 'PASSWORD_CHANGE_REQUIRED') throw redirect('/change-password');

  throw new ApiError(
    response.status,
    error?.code ?? 'UNKNOWN',
    error?.message ?? 'Erro inesperado.',
    error?.fields,
    error?.details,
  );
}
