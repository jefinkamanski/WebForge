import type { MediaListResponse, MediaResponse } from '@site/shared';
import { eq } from 'drizzle-orm';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { createDb } from '../../db/client.js';
import { media, posts } from '../../db/schema.js';
import {
  TEST_BCRYPT_COST,
  listen,
  loadTestEnv,
  readBody,
  removeTestUploads,
  resetAndBootstrap,
  signInAdmin,
  type TestServer,
} from '../../test/helpers.js';

const env = loadTestEnv();
// ~10 KB: força os limites de tamanho com arquivos pequenos
const tinyLimitsEnv = loadTestEnv({
  UPLOAD_DIR: env.UPLOAD_DIR,
  UPLOAD_MAX_IMAGE_MB: '0.01',
  UPLOAD_MAX_VIDEO_MB: '0.01',
});

const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(64)]);
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(64)]);
const HEIC = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(64)]);

interface ErrorBody {
  error: { code: string; fields?: Record<string, string[]>; details?: { usage: { id: string }[] } };
}

async function jpeg(width: number, height: number, orientation?: number): Promise<Buffer> {
  const image = sharp({
    create: { width, height, channels: 3, background: '#cc3366' },
  });
  return (orientation ? image.withMetadata({ orientation }) : image).jpeg().toBuffer();
}

describe('media', () => {
  const { pool, db } = createDb(env);
  let api: TestServer;
  let tinyApi: TestServer;
  let cookie = '';

  function upload(
    data: Buffer,
    fields: { alt?: string; name?: string; type?: string } = {},
    server = api,
    auth = cookie,
  ) {
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(data)], { type: fields.type ?? 'application/octet-stream' }),
      fields.name ?? 'arquivo.bin',
    );
    if (fields.alt !== undefined) form.append('alt', fields.alt);
    return fetch(`${server.baseUrl}/media`, {
      method: 'POST',
      headers: auth ? { cookie: auth } : {},
      body: form,
    });
  }

  const request = (route: string, init: RequestInit = {}) =>
    fetch(`${api.baseUrl}${route}`, { ...init, headers: { cookie, ...init.headers } });

  const uploadImage = async (width = 2000, height = 1000) =>
    readBody<MediaResponse>(await upload(await jpeg(width, height), { alt: 'Foto de teste' }));

  const putSection = (key: string, body: unknown) =>
    request(`/sections/${key}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  const filesOnDisk = async () =>
    (await readdir(env.UPLOAD_DIR, { recursive: true }).catch(() => [])).filter(
      (entry) => !entry.startsWith('.tmp'),
    );

  beforeAll(async () => {
    const options = { db, bcryptCost: TEST_BCRYPT_COST };
    api = await listen(createApp({ env, ...options }));
    tinyApi = await listen(createApp({ env: tinyLimitsEnv, ...options }));
  });

  beforeEach(async () => {
    await resetAndBootstrap(env);
    await removeTestUploads(env);
    cookie = await signInAdmin(api.baseUrl);
  });

  afterAll(async () => {
    await Promise.all([api.close(), tinyApi.close()]);
    await pool.end();
    await removeTestUploads(env);
  });

  describe('image upload', () => {
    it('converts to WebP with responsive widths and serves them with long cache', async () => {
      const response = await upload(await jpeg(2000, 1000), { alt: 'Fachada', name: 'foto.jpg' });
      const body = await readBody<MediaResponse>(response);

      expect(response.status).toBe(201);
      expect(body).toMatchObject({
        kind: 'image',
        mime: 'image/webp',
        alt: 'Fachada',
        width: 1920,
      });
      expect(body.variants.map((variant) => variant.width)).toEqual([480, 768, 1280, 1920]);

      const file = await fetch(`${api.baseUrl}${body.variants[0]?.url}`);
      expect(file.status).toBe(200);
      expect(file.headers.get('content-type')).toBe('image/webp');
      expect(file.headers.get('cache-control')).toMatch(/immutable/);
      expect(file.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
      expect((await sharp(Buffer.from(await file.arrayBuffer())).metadata()).width).toBe(480);
    });

    it('never upscales small images', async () => {
      const body = await uploadImage(300, 200);

      expect(body.variants).toHaveLength(1);
      expect(body.variants[0]).toMatchObject({ width: 300, height: 200 });
    });

    it('applies EXIF orientation before sizing', async () => {
      const body = await readBody<MediaResponse>(
        await upload(await jpeg(2000, 1000, 6), { alt: 'Girada' }),
      );

      expect(body).toMatchObject({ width: 1000, height: 2000 });
      expect(body.variants.map((variant) => variant.width)).toEqual([480, 768, 1000]);
    });

    it('requires alt text and leaves nothing behind', async () => {
      const response = await upload(await jpeg(400, 300));
      const body = await readBody<ErrorBody>(response);

      expect(response.status).toBe(400);
      expect(body.error.fields).toHaveProperty('alt');
      expect(await filesOnDisk()).toEqual([]);
      expect(await readdir(path.join(env.UPLOAD_DIR, '.tmp'))).toEqual([]);
    });

    it('requires authentication', async () => {
      const response = await upload(await jpeg(400, 300), { alt: 'x' }, api, '');

      expect(response.status).toBe(401);
    });

    it('rejects files that are not real images, whatever their name says', async () => {
      const fake = await upload(Buffer.from('isto não é uma imagem'), {
        alt: 'x',
        name: 'foto.jpg',
        type: 'image/jpeg',
      });
      const svg = await upload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), {
        alt: 'x',
        name: 'a.png',
        type: 'image/png',
      });
      const gif = await upload(
        await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } })
          .gif()
          .toBuffer(),
        { alt: 'x', name: 'a.jpg' },
      );

      for (const response of [fake, svg, gif]) {
        expect(response.status).toBe(415);
        expect((await readBody<ErrorBody>(response)).error.code).toBe('UNSUPPORTED_MEDIA');
      }
      expect(await filesOnDisk()).toEqual([]);
      expect(await readdir(path.join(env.UPLOAD_DIR, '.tmp'))).toEqual([]);
    });

    it('rejects images above the size limit', async () => {
      const noise = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 3,
          background: '#000',
          noise: { type: 'gaussian', mean: 128, sigma: 60 },
        },
      })
        .png()
        .toBuffer();
      expect(noise.length).toBeGreaterThan(10_485);

      const response = await upload(noise, { alt: 'x' }, tinyApi);

      expect(response.status).toBe(413);
      expect(await filesOnDisk()).toEqual([]);
    });

    it('ignores the client file name (no path traversal)', async () => {
      const response = await upload(await jpeg(400, 300), { alt: 'x', name: '../../../evil.jpg' });
      const body = await readBody<MediaResponse>(response);

      expect(response.status).toBe(201);
      expect(body.url).toMatch(/^\/uploads\/[0-9a-f-]{36}\/400\.webp$/);
      const outside = await stat(path.join(env.UPLOAD_DIR, '..', 'evil.jpg')).catch(() => null);
      expect(outside).toBeNull();
    });

    it('does not serve the temporary folder or traversal paths', async () => {
      await uploadImage(400, 300);

      expect((await fetch(`${api.baseUrl}/uploads/.tmp/`)).status).toBe(404);
      expect((await fetch(`${api.baseUrl}/uploads/%2e%2e/%2e%2e/.env`)).status).toBe(404);
    });
  });

  describe('video upload', () => {
    it.each([
      ['MP4', MP4, 'video/mp4', 'mp4'],
      ['WebM', WEBM, 'video/webm', 'webm'],
    ])('accepts %s by its real content', async (_label, data, mime, extension) => {
      const response = await upload(data, { alt: 'Vídeo da home', name: 'qualquer.bin' });
      const body = await readBody<MediaResponse>(response);

      expect(response.status).toBe(201);
      expect(body).toMatchObject({ kind: 'video', mime, variants: [] });
      expect(body.url).toMatch(new RegExp(`/video\\.${extension}$`));
      expect((await fetch(`${api.baseUrl}${body.url}`)).status).toBe(200);
    });

    it('rejects look-alike files and image containers', async () => {
      const text = await upload(Buffer.from('não sou um vídeo'), {
        alt: 'x',
        name: 'a.mp4',
        type: 'video/mp4',
      });
      const heic = await upload(HEIC, { alt: 'x', name: 'a.mp4', type: 'video/mp4' });

      expect(text.status).toBe(415);
      expect(heic.status).toBe(415);
    });

    it('rejects videos above the size limit', async () => {
      const big = Buffer.concat([MP4, Buffer.alloc(20_000)]);

      const response = await upload(big, { alt: 'x' }, tinyApi);

      expect(response.status).toBe(413);
      expect(await filesOnDisk()).toEqual([]);
    });
  });

  describe('library', () => {
    it('lists with pagination and kind filter, newest first', async () => {
      await uploadImage(400, 300);
      await uploadImage(500, 300);
      await upload(MP4, { alt: 'Vídeo' });

      const all = await readBody<MediaListResponse>(await request('/media?pageSize=2'));
      const images = await readBody<MediaListResponse>(await request('/media?kind=image'));
      const page2 = await readBody<MediaListResponse>(await request('/media?pageSize=2&page=2'));

      expect(all).toMatchObject({ total: 3, page: 1, pageSize: 2 });
      expect(all.items.map((item) => item.kind)).toEqual(['video', 'image']);
      expect(images.total).toBe(2);
      expect(page2.items).toHaveLength(1);
    });

    it('requires authentication to list', async () => {
      expect((await fetch(`${api.baseUrl}/media`)).status).toBe(401);
    });

    it('exposes the configured size limits', async () => {
      const response = await request('/media/limits');

      expect(await response.json()).toEqual({
        imageBytes: 8 * 1024 * 1024,
        videoBytes: 25 * 1024 * 1024,
      });
      expect((await fetch(`${api.baseUrl}/media/limits`)).status).toBe(401);
    });

    it('edits alt text and validates it', async () => {
      const created = await uploadImage(400, 300);
      const patch = (alt: string) =>
        request(`/media/${created.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ alt }),
        });

      const ok = await patch('Novo texto');
      const empty = await patch('   ');

      expect((await readBody<MediaResponse>(ok)).alt).toBe('Novo texto');
      expect(empty.status).toBe(400);
      expect((await request('/media/999999')).status).toBe(404);
    });
  });

  describe('delete', () => {
    it('removes the record and every variant from disk', async () => {
      const created = await uploadImage(2000, 1000);
      expect(await filesOnDisk()).not.toEqual([]);

      const response = await request(`/media/${created.id}`, { method: 'DELETE' });

      expect(response.status).toBe(204);
      expect((await request(`/media/${created.id}`)).status).toBe(404);
      expect(await filesOnDisk()).toEqual([]);
      expect((await fetch(`${api.baseUrl}${created.url}`)).status).toBe(404);
    });

    it('is blocked while a section uses the media, and says where', async () => {
      const logo = await uploadImage(400, 300);
      await putSection('header', { siteName: 'Site', logoMediaId: logo.id, navItems: [] });

      const blocked = await request(`/media/${logo.id}`, { method: 'DELETE' });
      const body = await readBody<ErrorBody>(blocked);

      expect(blocked.status).toBe(409);
      expect(body.error.code).toBe('MEDIA_IN_USE');
      expect(body.error.details?.usage).toEqual([
        expect.objectContaining({ type: 'section', id: 'header' }),
      ]);
      expect(await filesOnDisk()).not.toEqual([]);

      await putSection('header', { siteName: 'Site', logoMediaId: null, navItems: [] });
      expect((await request(`/media/${logo.id}`, { method: 'DELETE' })).status).toBe(204);
    });

    it('is blocked while a post uses it as cover', async () => {
      const cover = await uploadImage(400, 300);
      await db
        .insert(posts)
        .values({ slug: 'post', title: 'Post', content: 'x', coverMediaId: cover.id });

      const blocked = await request(`/media/${cover.id}`, { method: 'DELETE' });
      const body = await readBody<ErrorBody>(blocked);

      expect(blocked.status).toBe(409);
      expect(body.error.details?.usage).toEqual([expect.objectContaining({ type: 'post' })]);
      const [row] = await db.select().from(media).where(eq(media.id, cover.id));
      expect(row).toBeDefined();
    });

    it('reports where a media is used', async () => {
      const poster = await uploadImage(400, 300);
      await putSection('seo', {
        siteName: 'Site',
        defaultTitle: 'Site',
        defaultDescription: '',
        shareImageMediaId: poster.id,
      });

      const response = await request(`/media/${poster.id}/usage`);

      expect((await readBody<{ usage: unknown[] }>(response)).usage).toHaveLength(1);
    });
  });
});
