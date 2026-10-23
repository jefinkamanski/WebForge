import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import type { Db } from './db/client.js';
import { createErrorHandler, notFoundHandler } from './http/error-handler.js';
import { createRequireAuth } from './modules/auth/auth.middleware.js';
import {
  DEFAULT_LOGIN_RATE_LIMIT,
  createAuthRouter,
  type LoginRateLimit,
} from './modules/auth/auth.routes.js';
import { BCRYPT_COST } from './db/bootstrap.js';
import { createAuthService } from './modules/auth/auth.service.js';

export interface AppOptions {
  env: Pick<Env, 'NODE_ENV' | 'TRUST_PROXY' | 'CORS_ORIGINS' | 'JWT_SECRET' | 'COOKIE_DOMAIN'>;
  db: Db;
  loginRateLimit?: LoginRateLimit;
  bcryptCost?: number;
}

export function createApp({
  env,
  db,
  loginRateLimit = DEFAULT_LOGIN_RATE_LIMIT,
  bcryptCost = BCRYPT_COST,
}: AppOptions) {
  const isProduction = env.NODE_ENV === 'production';
  const authConfig = {
    jwtSecret: env.JWT_SECRET,
    cookieDomain: env.COOKIE_DOMAIN,
    secureCookies: isProduction,
    bcryptCost,
  };
  const authService = createAuthService(db, authConfig);
  const requireAuth = createRequireAuth(authService);

  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(
    '/auth',
    createAuthRouter({ service: authService, config: authConfig, requireAuth, loginRateLimit }),
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler(isProduction));

  return app;
}
