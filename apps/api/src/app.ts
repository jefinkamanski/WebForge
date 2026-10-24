import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
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
import { createOriginGuard } from './http/origin-guard.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createMediaRouter } from './modules/media/media.routes.js';
import { createMediaService } from './modules/media/media.service.js';
import { createRevalidator } from './modules/revalidation/revalidator.js';
import { createSectionsRouter } from './modules/sections/sections.routes.js';
import { createSectionsService } from './modules/sections/sections.service.js';
import { PUBLIC_UPLOADS_PATH, createDiskStorage } from './storage/storage.js';

const MB = 1024 * 1024;

export interface AppOptions {
  env: Pick<
    Env,
    | 'NODE_ENV'
    | 'TRUST_PROXY'
    | 'CORS_ORIGINS'
    | 'JWT_SECRET'
    | 'COOKIE_DOMAIN'
    | 'UPLOAD_DIR'
    | 'UPLOAD_MAX_IMAGE_MB'
    | 'UPLOAD_MAX_VIDEO_MB'
    | 'WEB_URL'
    | 'REVALIDATE_SECRET'
  >;
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
  // Mensagens de validação (devolvidas ao painel) em português
  z.config(z.locales.pt());
  const isProduction = env.NODE_ENV === 'production';
  const authConfig = {
    jwtSecret: env.JWT_SECRET,
    cookieDomain: env.COOKIE_DOMAIN,
    secureCookies: isProduction,
    bcryptCost,
  };
  const authService = createAuthService(db, authConfig);
  const requireAuth = createRequireAuth(authService);

  const storage = createDiskStorage(env.UPLOAD_DIR);
  const limits = {
    imageBytes: Math.floor(env.UPLOAD_MAX_IMAGE_MB * MB),
    videoBytes: Math.floor(env.UPLOAD_MAX_VIDEO_MB * MB),
  };
  const mediaService = createMediaService(db, storage, limits);
  const sectionsService = createSectionsService(
    db,
    createRevalidator({ webUrl: env.WEB_URL, secret: env.REVALIDATE_SECRET }),
  );

  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  // Arquivos enviados: nomes aleatórios (imutáveis) e liberados para site/painel em outras origens
  app.use(
    PUBLIC_UPLOADS_PATH,
    express.static(env.UPLOAD_DIR, {
      index: false,
      dotfiles: 'ignore',
      immutable: true,
      maxAge: '365d',
      setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }),
  );
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(createOriginGuard(env.CORS_ORIGINS));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(
    '/auth',
    createAuthRouter({ service: authService, config: authConfig, requireAuth, loginRateLimit }),
  );
  app.use('/sections', createSectionsRouter({ service: sectionsService, requireAuth }));
  app.use(
    '/media',
    createMediaRouter({ service: mediaService, requireAuth, uploadDir: env.UPLOAD_DIR, limits }),
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler(isProduction));

  return app;
}
