import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { HttpError } from '../../http/errors.js';
import { createAuthController } from './auth.controller.js';
import type { RequireAuth } from './auth.middleware.js';
import type { AuthConfig, AuthService } from './auth.service.js';

export interface LoginRateLimit {
  windowMs: number;
  limit: number;
}

export const DEFAULT_LOGIN_RATE_LIMIT: LoginRateLimit = { windowMs: 15 * 60 * 1000, limit: 10 };

interface AuthRouterDeps {
  service: AuthService;
  config: AuthConfig;
  requireAuth: RequireAuth;
  loginRateLimit: LoginRateLimit;
}

export function createAuthRouter({ service, config, requireAuth, loginRateLimit }: AuthRouterDeps) {
  const controller = createAuthController(service, config);
  const router = Router();

  // Só tentativas falhas contam, então um uso normal nunca é bloqueado
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

  router.post('/login', loginLimiter, controller.login);
  router.post('/logout', controller.logout);
  router.get('/me', requireAuth({ allowPasswordChangePending: true }), controller.me);
  router.post(
    '/change-password',
    requireAuth({ allowPasswordChangePending: true }),
    controller.changePassword,
  );

  return router;
}
