import { listPostsQuerySchema, listPublicPostsQuerySchema } from '@webforge/shared';
import express, { Router } from 'express';
import { z } from 'zod';
import type { RequireAdmin } from '../auth/auth.middleware.js';
import type { PostsService } from './posts.service.js';

const idSchema = z.coerce.number().int().positive();
const slugSchema = z.string().max(160);

// O texto de um post passa dos 100 kB do limite global
export const POSTS_JSON_LIMIT = '1mb';

interface PostsRouterDeps {
  service: PostsService;
  requireAdmin: RequireAdmin;
}

// /posts (painel): todos os posts, inclusive rascunhos e lixeira
export function createPostsRouter({ service, requireAdmin }: PostsRouterDeps) {
  const router = Router();
  router.use(requireAdmin());
  router.use(express.json({ limit: POSTS_JSON_LIMIT }));

  const id = (params: Record<string, string | undefined>) => idSchema.parse(params['id']);

  router.get('/', async (req, res) => {
    res.json(await service.list(listPostsQuerySchema.parse(req.query)));
  });

  router.post('/', async (req, res) => {
    res.status(201).json(await service.create(req.body));
  });

  router.get('/:id', async (req, res) => {
    res.json(await service.get(id(req.params)));
  });

  router.put('/:id', async (req, res) => {
    res.json(await service.update(id(req.params), req.body));
  });

  // Manda para a lixeira
  router.delete('/:id', async (req, res) => {
    await service.trash(id(req.params));
    res.status(204).end();
  });

  router.post('/:id/restore', async (req, res) => {
    res.json(await service.restore(id(req.params)));
  });

  router.delete('/:id/permanent', async (req, res) => {
    await service.destroy(id(req.params));
    res.status(204).end();
  });

  return router;
}

// /site/posts (público): só posts publicados, lidos pelo servidor do Next.js
export function createPublicPostsRouter(service: PostsService) {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await service.listPublished(listPublicPostsQuerySchema.parse(req.query)));
  });

  router.get('/slugs', async (_req, res) => {
    res.json(await service.slugs());
  });

  router.get('/:slug', async (req, res) => {
    res.json(await service.getPublished(slugSchema.parse(req.params['slug'])));
  });

  return router;
}
