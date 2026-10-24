import type { RequestHandler } from 'express';
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import multer, { MulterError } from 'multer';
import { HttpError } from '../../http/errors.js';
import type { RequireAuth } from '../auth/auth.middleware.js';
import { createMediaController } from './media.controller.js';
import type { MediaLimits, MediaService } from './media.service.js';

interface MediaRouterDeps {
  service: MediaService;
  requireAuth: RequireAuth;
  uploadDir: string;
  limits: MediaLimits;
}

export function createMediaRouter({ service, requireAuth, uploadDir, limits }: MediaRouterDeps) {
  const controller = createMediaController(service);
  const tmpDir = path.join(uploadDir, '.tmp');

  // O upload vai direto para disco (nunca para a memória); nome temporário gerado aqui
  const uploader = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => {
        mkdir(tmpDir, { recursive: true }).then(
          () => callback(null, tmpDir),
          (error: Error) => callback(error, tmpDir),
        );
      },
      filename: (_req, _file, callback) => callback(null, randomUUID()),
    }),
    limits: {
      fileSize: Math.max(limits.imageBytes, limits.videoBytes),
      files: 1,
      fields: 5,
      fieldSize: 2048,
    },
  });

  const receiveFile: RequestHandler = (req, res, next) => {
    uploader.single('file')(req, res, (error: unknown) => {
      if (error instanceof MulterError) {
        const tooLarge = error.code === 'LIMIT_FILE_SIZE';
        next(
          new HttpError(
            tooLarge ? 413 : 400,
            tooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
            tooLarge ? 'O arquivo excede o tamanho máximo permitido.' : 'Upload inválido.',
          ),
        );
        return;
      }
      next(error);
    });
  };

  const router = Router();
  router.use(requireAuth());

  router.post('/', receiveFile, controller.upload);
  router.get('/', controller.list);
  router.get('/limits', controller.limits);
  router.get('/:id', controller.get);
  router.get('/:id/usage', controller.usage);
  router.patch('/:id', controller.updateAlt);
  router.delete('/:id', controller.remove);

  return router;
}
