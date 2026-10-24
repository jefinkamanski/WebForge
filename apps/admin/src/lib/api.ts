import { redirect } from 'react-router';

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

// Caminhos públicos devolvidos pela API (/uploads/...) viram URLs completas
export const assetUrl = (path: string) => `${API_URL}${path}`;

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
    details: unknown = undefined,
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
  error?: { code?: string; message?: string; fields?: Record<string, string[]>; details?: unknown };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  json?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
}

// Chamadas só acontecem em loaders/actions: sessão expirada (401) leva ao login
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', json, formData, signal } = options;

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
      ...(formData && { body: formData }),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Não foi possível conectar ao servidor.');
  }

  if (response.status === 401 && !path.startsWith('/auth/login')) {
    throw redirect('/login');
  }
  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const { error } = (body ?? {}) as ErrorBody;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'Erro inesperado.',
      error?.fields,
      error?.details,
    );
  }
  return body as T;
}
