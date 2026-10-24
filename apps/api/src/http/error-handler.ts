import type { ErrorRequestHandler, RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from './errors.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, 'NOT_FOUND', 'Recurso não encontrado.'));
};

// Erros 4xx do body-parser (JSON inválido, corpo grande demais) trazem status e `expose`
function isClientError(error: unknown): error is { status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500 &&
    'expose' in error &&
    error.expose === true
  );
}

export function createErrorHandler(isProduction: boolean): ErrorRequestHandler {
  return (error: unknown, _req, res, _next) => {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos.',
          fields: z.flattenError(error).fieldErrors,
        },
      });
      return;
    }

    if (error instanceof HttpError) {
      res.status(error.status).json({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined && { details: error.details }),
        },
      });
      return;
    }

    if (isClientError(error)) {
      res
        .status(error.status)
        .json({ error: { code: 'BAD_REQUEST', message: 'Requisição inválida.' } });
      return;
    }

    // Em produção registra só a mensagem: sem stack e sem dados da requisição
    console.error(isProduction && error instanceof Error ? error.message : error);
    res
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } });
  };
}
