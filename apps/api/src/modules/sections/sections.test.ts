import { defaultSectionContent } from '@site/shared';
import { eq } from 'drizzle-orm';
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { createDb } from '../../db/client.js';
import { siteSections } from '../../db/schema.js';
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

const REVALIDATE_SECRET = 'segredo-de-revalidacao-de-teste';

interface Received {
  url: string | undefined;
  headers: IncomingHttpHeaders;
  body: unknown;
}

interface ErrorBody {
  error: { code: string; fields?: Record<string, string[]> };
}

// Site (Next.js) falso: registra os pedidos de revalidação recebidos
async function startFakeWeb(status = 200) {
  const received: Received[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      received.push({
        url: req.url,
        headers: req.headers,
        body: JSON.parse(Buffer.concat(chunks).toString() || 'null'),
      });
      res.statusCode = status;
      res.end('{}');
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    received,
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

describe('sections', () => {
  const baseEnv = loadTestEnv();
  const { pool, db } = createDb(baseEnv);
  let fakeWeb: Awaited<ReturnType<typeof startFakeWeb>>;
  let api: TestServer;
  let offlineApi: TestServer;
  let cookie = '';

  const options = { db, bcryptCost: TEST_BCRYPT_COST };

  const put = (key: string, body: unknown, auth = cookie) =>
    fetch(`${api.baseUrl}/sections/${key}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...(auth && { cookie: auth }) },
      body: JSON.stringify(body),
    });

  const get = (key: string) => fetch(`${api.baseUrl}/sections/${key}`);

  async function uploadMedia(data: Buffer, alt: string) {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(data)]), 'arquivo');
    form.append('alt', alt);
    const response = await fetch(`${api.baseUrl}/media`, {
      method: 'POST',
      headers: { cookie },
      body: form,
    });
    return (await response.json()) as { id: number };
  }

  const image = () =>
    sharp({ create: { width: 400, height: 300, channels: 3, background: '#336699' } })
      .jpeg()
      .toBuffer();
  const mp4 = () =>
    Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(64)]);

  const hero = (overrides: Record<string, unknown> = {}) => ({
    ...defaultSectionContent.hero,
    ...overrides,
  });

  beforeAll(async () => {
    fakeWeb = await startFakeWeb();
    const env = loadTestEnv({
      UPLOAD_DIR: baseEnv.UPLOAD_DIR,
      WEB_URL: fakeWeb.url,
      REVALIDATE_SECRET,
    });
    api = await listen(createApp({ env, ...options }));
    // Site fora do ar: porta fechada
    const offlineEnv = loadTestEnv({
      UPLOAD_DIR: baseEnv.UPLOAD_DIR,
      WEB_URL: 'http://127.0.0.1:1',
      REVALIDATE_SECRET,
    });
    offlineApi = await listen(createApp({ env: offlineEnv, ...options }));
  });

  beforeEach(async () => {
    await resetAndBootstrap(baseEnv);
    cookie = await signInAdmin(api.baseUrl);
    fakeWeb.received.length = 0;
  });

  afterAll(async () => {
    await Promise.all([api.close(), offlineApi.close(), fakeWeb.close()]);
    await pool.end();
    await removeTestUploads(baseEnv);
  });

  describe('GET /sections/:key', () => {
    it('is public and returns the seeded default', async () => {
      const response = await fetch(`${api.baseUrl}/sections/header`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(defaultSectionContent.header);
    });

    it('returns 404 for unknown keys, including inherited property names', async () => {
      for (const key of ['nao-existe', 'constructor', '__proto__', 'toString']) {
        const response = await get(key);

        expect(response.status).toBe(404);
        expect((await readBody<ErrorBody>(response)).error.code).toBe('SECTION_NOT_FOUND');
      }
    });

    it('falls back to the default when the stored content has an outdated shape', async () => {
      await db
        .update(siteSections)
        .set({ content: { title: 'Formato antigo', videoMediaId: null } })
        .where(eq(siteSections.key, 'hero'));

      const response = await get('hero');

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(defaultSectionContent.hero);
    });
  });

  describe('PUT /sections/:key', () => {
    it('requires authentication', async () => {
      expect((await put('header', defaultSectionContent.header, '')).status).toBe(401);
    });

    it('saves, normalizes and returns the content', async () => {
      const response = await put('header', {
        siteName: '  Minha Empresa  ',
        logoMediaId: null,
        navItems: [{ label: 'Blog', href: '/blog' }],
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ siteName: 'Minha Empresa' });
      expect(await (await get('header')).json()).toMatchObject({
        siteName: 'Minha Empresa',
        navItems: [{ label: 'Blog', href: '/blog' }],
      });
    });

    it('validates the body with the section schema and reports fields', async () => {
      const response = await put('seo', { siteName: '', defaultTitle: 'x'.repeat(200) });
      const body = await readBody<ErrorBody>(response);

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(Object.keys(body.error.fields ?? {})).toEqual(
        expect.arrayContaining(['siteName', 'defaultTitle', 'defaultDescription']),
      );
    });

    it('rejects unsafe link schemes', async () => {
      const response = await put('footer', {
        text: '',
        links: [{ label: 'Clique', href: 'javascript:alert(1)' }],
      });

      expect(response.status).toBe(400);
    });

    it('rejects unknown keys and keeps the stored content', async () => {
      expect((await put('nao-existe', {})).status).toBe(404);
      expect((await put('constructor', {})).status).toBe(404);
    });

    it('requires a poster when the hero has a video', async () => {
      const video = await uploadMedia(mp4(), 'Vídeo');

      const response = await put('hero', hero({ videoMp4MediaId: video.id }));
      const body = await readBody<ErrorBody>(response);

      expect(response.status).toBe(400);
      expect(body.error.fields).toHaveProperty('posterMediaId');
    });

    it('accepts a hero with video and poster', async () => {
      const video = await uploadMedia(mp4(), 'Vídeo');
      const poster = await uploadMedia(await image(), 'Poster');

      const response = await put(
        'hero',
        hero({ videoMp4MediaId: video.id, posterMediaId: poster.id }),
      );

      expect(response.status).toBe(200);
    });

    it('rejects media that does not exist or has the wrong kind', async () => {
      const video = await uploadMedia(mp4(), 'Vídeo');
      const photo = await uploadMedia(await image(), 'Foto');

      const missing = await put('header', { siteName: 'x', logoMediaId: 999999, navItems: [] });
      const videoAsLogo = await put('header', {
        siteName: 'x',
        logoMediaId: video.id,
        navItems: [],
      });
      const photoAsVideo = await put(
        'hero',
        hero({ videoMp4MediaId: photo.id, posterMediaId: photo.id }),
      );

      expect((await readBody<ErrorBody>(missing)).error.fields).toHaveProperty('logoMediaId');
      expect((await readBody<ErrorBody>(videoAsLogo)).error.fields).toHaveProperty('logoMediaId');
      expect((await readBody<ErrorBody>(photoAsVideo)).error.fields).toHaveProperty(
        'videoMp4MediaId',
      );
    });

    it('rejects writes from origins outside CORS_ORIGINS', async () => {
      const response = await fetch(`${api.baseUrl}/sections/header`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', cookie, origin: 'https://evil.example' },
        body: JSON.stringify(defaultSectionContent.header),
      });

      expect(response.status).toBe(403);
      expect((await readBody<ErrorBody>(response)).error.code).toBe('ORIGIN_NOT_ALLOWED');
    });

    it('accepts writes from an allowed origin', async () => {
      const response = await fetch(`${api.baseUrl}/sections/header`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', cookie, origin: 'http://localhost:5173' },
        body: JSON.stringify(defaultSectionContent.header),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('revalidation', () => {
    it('asks the site to revalidate the section tag with the shared secret', async () => {
      await put('footer', { text: 'Rodapé', links: [] });

      expect(fakeWeb.received).toHaveLength(1);
      expect(fakeWeb.received[0]).toMatchObject({
        url: '/api/revalidate',
        body: { tags: ['section:footer'] },
      });
      expect(fakeWeb.received[0]?.headers['x-revalidate-secret']).toBe(REVALIDATE_SECRET);
    });

    it('does not revalidate when the save is rejected', async () => {
      await put('seo', { siteName: '' });

      expect(fakeWeb.received).toHaveLength(0);
    });

    it('does not fail the save when the site is offline', async () => {
      const response = await fetch(`${offlineApi.baseUrl}/sections/footer`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', cookie },
        body: JSON.stringify({ text: 'Mesmo assim salva', links: [] }),
      });

      expect(response.status).toBe(200);
      expect(await (await get('footer')).json()).toMatchObject({ text: 'Mesmo assim salva' });
    });
  });
});
