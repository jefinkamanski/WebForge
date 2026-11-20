import { changePasswordSchema, loginSchema } from '@webforge/shared';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { HttpError } from '../../http/errors.js';
import {
  clearSessionCookie,
  getSessionAdmin,
  setSessionCookie,
  type RequireAdmin,
} from './auth.middleware.js';
import { toAdminUser, type AuthConfig, type AuthService } from './auth.service.js';

export interface LoginRateLimit {
  windowMs: number;
  limit: number;
}

export const DEFAULT_LOGIN_RATE_LIMIT: LoginRateLimit = { windowMs: 15 * 60 * 1000, limit: 10 };

interface AuthRouterDeps {
  service: AuthService;
  config: AuthConfig;
  requireAdmin: RequireAdmin;
  loginRateLimit: LoginRateLimit;
}

export function createAuthRouter({
  service,
  config,
  requireAdmin,
  loginRateLimit,
}: AuthRouterDeps) {
  const router = Router();
  const pendingAllowed = requireAdmin({ allowPasswordChangePending: true });

  // Só tentativas falhas contam, então o uso normal nunca é bloqueado
  const loginLimiter = rateLimit({
    ...loginRateLimit,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(
        new HttpError(429, 'TOO_MANY_ATTEMPTS', 'Muitas tentativas. Tente novamente mais tarde.'),
      );
    },
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const { user, token } = await service.login(email, password);
    setSessionCookie(res, config, token);
    res.json({ user: toAdminUser(user) });
  });

  router.post('/logout', (_req, res) => {
    clearSessionCookie(res, config);
    res.status(204).end();
  });

  router.get('/me', pendingAllowed, (_req, res) => {
    res.json({ user: toAdminUser(getSessionAdmin(res)) });
  });

  router.post('/change-password', pendingAllowed, async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const { user, token } = await service.changePassword(
      getSessionAdmin(res),
      currentPassword,
      newPassword,
    );
    setSessionCookie(res, config, token);
    res.json({ user: toAdminUser(user) });
  });

  return router;
}
