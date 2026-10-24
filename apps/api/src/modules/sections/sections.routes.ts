import { isSectionKey, type SectionKey } from '@site/shared';
import { Router, type RequestHandler } from 'express';
import { HttpError } from '../../http/errors.js';
import type { RequireAuth } from '../auth/auth.middleware.js';
import type { SectionsService } from './sections.service.js';

function parseKey(raw: unknown): SectionKey {
  if (typeof raw !== 'string' || !isSectionKey(raw)) {
    throw new HttpError(404, 'SECTION_NOT_FOUND', 'Seção não encontrada.');
  }
  return raw;
}

interface SectionsRouterDeps {
  service: SectionsService;
  requireAuth: RequireAuth;
}

export function createSectionsRouter({ service, requireAuth }: SectionsRouterDeps) {
  // Leitura pública: o site (Next.js) busca o conteúdo no servidor
  const get: RequestHandler = async (req, res) => {
    res.json(await service.get(parseKey(req.params['key'])));
  };

  const put: RequestHandler = async (req, res) => {
    res.json(await service.put(parseKey(req.params['key']), req.body));
  };

  const router = Router();
  router.get('/:key', get);
  router.put('/:key', requireAuth(), put);
  return router;
}
