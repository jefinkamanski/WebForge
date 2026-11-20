import { Router } from 'express';
import type { RequireAdmin } from '../auth/auth.middleware.js';
import { parseSectionKey, type SectionsService } from './sections.service.js';

// GET /site (público): lido pelo servidor do Next.js
export function createSiteRouter(service: SectionsService) {
  const router = Router();
  router.get('/', async (_req, res) => {
    res.json(await service.getSite());
  });
  return router;
}

interface SectionsRouterDeps {
  service: SectionsService;
  requireAdmin: RequireAdmin;
}

// /sections/:key (painel): conteúdo bruto, com ids de mídia, para edição
export function createSectionsRouter({ service, requireAdmin }: SectionsRouterDeps) {
  const router = Router();
  router.use(requireAdmin());

  router.get('/:key', async (req, res) => {
    res.json(await service.getEdit(parseSectionKey(req.params['key'])));
  });

  router.put('/:key', async (req, res) => {
    res.json(await service.put(parseSectionKey(req.params['key']), req.body));
  });

  return router;
}
