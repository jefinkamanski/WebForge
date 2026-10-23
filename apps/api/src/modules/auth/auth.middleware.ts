import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import { HttpError } from '../../http/errors.js';
import type { AuthConfig, AuthService, UserRow } from './auth.service.js';
import { SESSION_MAX_AGE_MS } from './token.js';

export const SESSION_COOKIE = 'session';

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

export function getSessionUser(res: Response): UserRow {
  return res.locals['sessionUser'] as UserRow;
}

export interface RequireAuthOptions {
  // Permite acesso mesmo com troca de senha pendente (me, logout, change-password)
  allowPasswordChangePending?: boolean;
}

export function createRequireAuth(service: AuthService) {
  return ({ allowPasswordChangePending = false }: RequireAuthOptions = {}): RequestHandler =>
    async (req: Request, res, next) => {
      const token: unknown = req.cookies?.[SESSION_COOKIE];
      const user = typeof token === 'string' ? await service.authenticate(token) : null;
      if (!user) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Sessão inválida ou expirada.');
      }
      if (user.mustChangePassword && !allowPasswordChangePending) {
        throw new HttpError(403, 'PASSWORD_CHANGE_REQUIRED', 'É necessário trocar a senha.');
      }

      res.locals['sessionUser'] = user;
      next();
    };
}

export type RequireAuth = ReturnType<typeof createRequireAuth>;
