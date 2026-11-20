import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import type { Env } from './config/env.js';
import { BCRYPT_COST } from './db/bootstrap.js';
import type { Db } from './db/client.js';
import { createErrorHandler, notFoundHandler } from './http/error-handler.js';
import { createOriginGuard } from './http/origin-guard.js';
import { createRequireAdmin } from './modules/auth/auth.middleware.js';
import {
  DEFAULT_LOGIN_RATE_LIMIT,
  createAuthRouter,
  type LoginRateLimit,
} from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import {
  DEFAULT_FORM_RATE_LIMIT,
  createFormsRouter,
  createPublicFormsRouter,
  type FormRateLimit,
} from './modules/forms/forms.routes.js';
import { createFormsService } from './modules/forms/forms.service.js';
import { createMailer, type MailConfig, type Mailer } from './modules/mail/mailer.js';
import { createMediaRouter } from './modules/media/media.routes.js';
import {
  DEFAULT_MEDIA_LIMITS,
  UPLOADS_PATH,
  createMediaService,
  type MediaLimits,
} from './modules/media/media.service.js';
import { createPostsRouter, createPublicPostsRouter } from './modules/posts/posts.routes.js';
import { createPostsService } from './modules/posts/posts.service.js';
import { createRevalidator, type Revalidator } from './modules/revalidation/revalidator.js';
import { createSectionsRouter, createSiteRouter } from './modules/sections/sections.routes.js';
import { createSectionsService } from './modules/sections/sections.service.js';
import { createDiskStorage } from './storage/disk.js';

export interface AppOptions {
  env: MailConfig &
    Pick<
      Env,
      | 'NODE_ENV'
      | 'TRUST_PROXY'
      | 'CORS_ORIGINS'
      | 'JWT_SECRET'
      | 'COOKIE_DOMAIN'
      | 'UPLOAD_DIR'
      | 'WEB_URL'
      | 'REVALIDATE_SECRET'
    >;
  db: Db;
  loginRateLimit?: LoginRateLimit;
  bcryptCost?: number;
  mediaLimits?: MediaLimits;
  revalidator?: Revalidator;
  mailer?: Mailer;
  formRateLimit?: FormRateLimit;
}

// Monta o Express: middlewares globais, rotas dos módulos e tratamento de erros
export function createApp({
  env,
  db,
  loginRateLimit = DEFAULT_LOGIN_RATE_LIMIT,
  bcryptCost = BCRYPT_COST,
  mediaLimits = DEFAULT_MEDIA_LIMITS,
  revalidator = createRevalidator({ webUrl: env.WEB_URL, secret: env.REVALIDATE_SECRET }),
  mailer = createMailer(env),
  formRateLimit = DEFAULT_FORM_RATE_LIMIT,
}: AppOptions) {
  // Mensagens de validação devolvidas ao painel em português
  z.config(z.locales.pt());
  const isProduction = env.NODE_ENV === 'production';

  const authConfig = {
    jwtSecret: env.JWT_SECRET,
    cookieDomain: env.COOKIE_DOMAIN,
    secureCookies: isProduction,
    bcryptCost,
  };
  const authService = createAuthService(db, authConfig);
  const requireAdmin = createRequireAdmin(authService);

  const storage = createDiskStorage(env.UPLOAD_DIR);
  const sectionsService = createSectionsService(db, revalidator);
  const postsService = createPostsService(db, revalidator);
  const formsService = createFormsService({
    db,
    mailer,
    getSiteName: async () => (await sectionsService.getSite()).seo.siteName,
  });
  const mediaService = createMediaService({
    db,
    storage,
    limits: mediaLimits,
    revalidator,
    findUsage: async (id) => [
      ...(await sectionsService.findMediaUsage(id)),
      ...(await postsService.findMediaUsage(id)),
    ],
  });

  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(createOriginGuard(env.CORS_ORIGINS));
  // Arquivos públicos: nomes únicos (cache imutável) e liberados para o site e o painel,
  // que ficam em outra origem. A pasta temporária (.tmp) nunca é servida.
  app.use(
    UPLOADS_PATH,
    (_req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(storage.root, {
      dotfiles: 'ignore',
      index: false,
      immutable: true,
      maxAge: '1y',
    }),
  );

  // /posts lê o próprio corpo (limite maior, só depois do login)
  const json = express.json({ limit: '100kb' });
  app.use((req, res, next) => {
    if (req.path.startsWith('/posts')) return next();
    json(req, res, next);
  });
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(
    '/auth',
    createAuthRouter({ service: authService, config: authConfig, requireAdmin, loginRateLimit }),
  );
  app.use('/site/posts', createPublicPostsRouter(postsService));
  app.use('/site/forms', createPublicFormsRouter(formsService, formRateLimit));
  app.use('/site', createSiteRouter(sectionsService));
  app.use('/sections', createSectionsRouter({ service: sectionsService, requireAdmin }));
  app.use('/posts', createPostsRouter({ service: postsService, requireAdmin }));
  app.use('/forms', createFormsRouter({ service: formsService, requireAdmin }));
  app.use(
    '/media',
    createMediaRouter({ service: mediaService, storage, limits: mediaLimits, requireAdmin }),
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler(isProduction));

  return app;
}
