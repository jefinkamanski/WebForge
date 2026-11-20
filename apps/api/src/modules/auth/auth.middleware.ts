import type { CookieOptions, RequestHandler, Response } from 'express';
import { HttpError } from '../../http/errors.js';
import type { AdminRow, AuthConfig, AuthService } from './auth.service.js';
import { SESSION_MAX_AGE_MS } from './token.js';

// Nome próprio do painel: uma futura conta do site usaria outro cookie
export const SESSION_COOKIE = 'wf_admin';

// Em localhost o navegador rejeita cookie com Domain explícito
function cookieOptions(config: AuthConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: 'lax',
    path: '/',
    ...(config.cookieDomain !== 'localhost' && { domain: config.cookieDomain }),
  };
}

export function setSessionCookie(res: Response, config: AuthConfig, token: string): void {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(config), maxAge: SESSION_MAX_AGE_MS });
}

export function clearSessionCookie(res: Response, config: AuthConfig): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions(config));
}

export function getSessionAdmin(res: Response): AdminRow {
  return res.locals['sessionAdmin'] as AdminRow;
}

export interface RequireAdminOptions {
  // Libera a rota mesmo com troca de senha pendente (me e change-password)
  allowPasswordChangePending?: boolean;
}

// Protege as rotas do painel: exige sessão válida e, por padrão, senha já trocada
export function createRequireAdmin(service: AuthService) {
  return ({ allowPasswordChangePending = false }: RequireAdminOptions = {}): RequestHandler =>
    async (req, res, next) => {
      const token: unknown = req.cookies?.[SESSION_COOKIE];
      const admin = typeof token === 'string' ? await service.authenticate(token) : null;
      if (!admin) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sessão inválida ou expirada.');
      }
      if (admin.mustChangePassword && !allowPasswordChangePending) {
        throw new HttpError(403, 'PASSWORD_CHANGE_REQUIRED', 'É necessário trocar a senha.');
      }

      res.locals['sessionAdmin'] = admin;
      next();
    };
}

export type RequireAdmin = ReturnType<typeof createRequireAdmin>;
