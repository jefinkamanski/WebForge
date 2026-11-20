import {
  HONEYPOT_FIELD,
  listSubmissionsQuerySchema,
  updateSubmissionSchema,
} from '@webforge/shared';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { HttpError } from '../../http/errors.js';
import type { RequireAdmin } from '../auth/auth.middleware.js';
import { parseFormKey, type FormsService } from './forms.service.js';

export interface FormRateLimit {
  windowMs: number;
  limit: number;
}

// Por IP: suficiente para quem preenche de verdade, caro para robôs
export const DEFAULT_FORM_RATE_LIMIT: FormRateLimit = { windowMs: 10 * 60 * 1000, limit: 5 };

const idSchema = z.coerce.number().int().positive();

// POST /site/forms/:key (público): chamado pelo navegador, a partir do site
export function createPublicFormsRouter(service: FormsService, formRateLimit: FormRateLimit) {
  const router = Router();
  const limiter = rateLimit({
    ...formRateLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(
        new HttpError(
          429,
          'TOO_MANY_SUBMISSIONS',
          'Muitos envios seguidos. Tente de novo mais tarde.',
        ),
      );
    },
  });

  router.post('/:key', limiter, async (req, res) => {
    const key = parseFormKey(req.params['key']);
    const body: unknown = req.body ?? {};
    // Honeypot preenchido = robô: responde como sucesso, sem gravar nem enviar nada
    const honeypot = (body as Record<string, unknown>)[HONEYPOT_FIELD];
    if (typeof honeypot === 'string' && honeypot.trim() !== '') {
      res.status(201).json({ ok: true });
      return;
    }
    await service.submit(key, body);
    res.status(201).json({ ok: true });
  });

  return router;
}

interface FormsRouterDeps {
  service: FormsService;
  requireAdmin: RequireAdmin;
}

// /forms (painel): envios e configuração de cada formulário
export function createFormsRouter({ service, requireAdmin }: FormsRouterDeps) {
  const router = Router();
  router.use(requireAdmin());

  router.get('/', async (_req, res) => {
    res.json(await service.list());
  });

  router.get('/:key/submissions', async (req, res) => {
    const key = parseFormKey(req.params['key']);
    res.json(await service.submissions(key, listSubmissionsQuerySchema.parse(req.query)));
  });

  router.patch('/:key/submissions/:id', async (req, res) => {
    const key = parseFormKey(req.params['key']);
    const { read } = updateSubmissionSchema.parse(req.body);
    res.json(await service.setRead(key, idSchema.parse(req.params['id']), read));
  });

  router.delete('/:key/submissions/:id', async (req, res) => {
    const key = parseFormKey(req.params['key']);
    await service.remove(key, idSchema.parse(req.params['id']));
    res.status(204).end();
  });

  router.get('/:key/settings', async (req, res) => {
    res.json(await service.getSettings(parseFormKey(req.params['key'])));
  });

  router.put('/:key/settings', async (req, res) => {
    res.json(await service.updateSettings(parseFormKey(req.params['key']), req.body));
  });

  router.post('/:key/test-email', async (req, res) => {
    res.json(await service.sendTest(parseFormKey(req.params['key'])));
  });

  return router;
}
