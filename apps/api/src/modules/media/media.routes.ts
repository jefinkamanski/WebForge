import { listMediaQuerySchema, mediaAltSchema, updateMediaSchema } from '@webforge/shared';
import { Router, type RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { z } from 'zod';
import { HttpError } from '../../http/errors.js';
import type { DiskStorage } from '../../storage/disk.js';
import type { RequireAdmin } from '../auth/auth.middleware.js';
import type { MediaLimits, MediaService } from './media.service.js';

const idSchema = z.coerce.number().int().positive();
const uploadFieldsSchema = z.object({ alt: mediaAltSchema });

interface MediaRouterDeps {
  service: MediaService;
  storage: DiskStorage;
  limits: MediaLimits;
  requireAdmin: RequireAdmin;
}

export function createMediaRouter({ service, storage, limits, requireAdmin }: MediaRouterDeps) {
  // Direto para disco (nunca para a memória), com nome temporário gerado aqui
  const uploader = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => {
        mkdir(storage.tmpDir, { recursive: true }).then(
          () => callback(null, storage.tmpDir),
          (error: Error) => callback(error, storage.tmpDir),
        );
      },
      filename: (_req, _file, callback) => callback(null, randomUUID()),
    }),
    limits: {
      fileSize: Math.max(limits.imageBytes, limits.videoBytes),
      files: 1,
      fields: 2,
      fieldSize: 1024,
    },
  });

  const receiveFile: RequestHandler = (req, res, next) => {
    uploader.single('file')(req, res, (error: unknown) => {
      if (error instanceof MulterError) {
        next(
          error.code === 'LIMIT_FILE_SIZE'
            ? new HttpError(413, 'FILE_TOO_LARGE', 'O arquivo excede o tamanho máximo permitido.')
            : new HttpError(400, 'INVALID_UPLOAD', 'Envio inválido.'),
        );
        return;
      }
      next(error);
    });
  };

  const router = Router();
  router.use(requireAdmin());

  router.post('/', receiveFile, async (req, res) => {
    const file = req.file;
    if (!file) throw new HttpError(400, 'FILE_REQUIRED', 'Escolha um arquivo para enviar.');

    const fields = uploadFieldsSchema.safeParse(req.body ?? {});
    if (!fields.success) {
      await rm(file.path, { force: true });
      throw fields.error;
    }
    const created = await service.upload({
      filePath: file.path,
      size: file.size,
      alt: fields.data.alt,
    });
    res.status(201).json(created);
  });

  router.get('/', async (req, res) => {
    res.json(await service.list(listMediaQuerySchema.parse(req.query)));
  });

  router.patch('/:id', async (req, res) => {
    const { alt } = updateMediaSchema.parse(req.body);
    res.json(await service.updateAlt(idSchema.parse(req.params['id']), alt));
  });

  router.delete('/:id', async (req, res) => {
    await service.remove(idSchema.parse(req.params['id']));
    res.status(204).end();
  });

  return router;
}
