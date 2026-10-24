import { listMediaQuerySchema, mediaAltSchema, updateMediaSchema } from '@site/shared';
import type { RequestHandler } from 'express';
import { rm } from 'node:fs/promises';
import { z } from 'zod';
import { HttpError } from '../../http/errors.js';
import type { MediaService } from './media.service.js';

const idSchema = z.coerce.number().int().positive();

export function createMediaController(service: MediaService) {
  const upload: RequestHandler = async (req, res) => {
    const file = req.file;
    if (!file) {
      throw new HttpError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo "file".');
    }

    // O arquivo temporário sempre é descartado, com sucesso ou erro
    try {
      const alt = mediaAltSchema.safeParse(req.body?.alt);
      if (!alt.success) {
        throw new z.ZodError(alt.error.issues.map((issue) => ({ ...issue, path: ['alt'] })));
      }
      const created = await service.upload({ filePath: file.path, alt: alt.data });
      res.status(201).json(created);
    } finally {
      await rm(file.path, { force: true });
    }
  };

  const list: RequestHandler = async (req, res) => {
    res.json(await service.list(listMediaQuerySchema.parse(req.query)));
  };

  const limits: RequestHandler = (_req, res) => {
    res.json(service.limits());
  };

  const get: RequestHandler = async (req, res) => {
    res.json(await service.get(idSchema.parse(req.params['id'])));
  };

  const usage: RequestHandler = async (req, res) => {
    res.json({ usage: await service.usage(idSchema.parse(req.params['id'])) });
  };

  const updateAlt: RequestHandler = async (req, res) => {
    const { alt } = updateMediaSchema.parse(req.body);
    res.json(await service.updateAlt(idSchema.parse(req.params['id']), alt));
  };

  const remove: RequestHandler = async (req, res) => {
    await service.remove(idSchema.parse(req.params['id']));
    res.status(204).end();
  };

  return { upload, list, limits, get, usage, updateAlt, remove };
}
