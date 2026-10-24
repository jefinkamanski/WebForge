import type { RequestHandler } from 'express';
import { HttpError } from './errors.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Defesa extra contra CSRF além do SameSite: escritas vindas de um navegador
// precisam ter Origin dentro de CORS_ORIGINS. Clientes sem Origin (curl, testes) passam.
export function createOriginGuard(allowedOrigins: string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);

  return (req, _res, next) => {
    const origin = req.headers.origin;
    if (WRITE_METHODS.has(req.method) && origin !== undefined && !allowed.has(origin)) {
      next(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origem não permitida.'));
      return;
    }
    next();
  };
}
