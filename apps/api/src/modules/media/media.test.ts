import type { MediaItem, MediaList } from '@webforge/shared';
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { createDb } from '../../db/client.js';
import { TMP_FOLDER } from '../../storage/disk.js';
import {
  TEST_BCRYPT_COST,
  fakeMp4,
  fakeRevalidator,
  get,
  listen,
  loadTestEnv,
  readBody,
  resetAndBootstrap,
  send,
  signInAdmin,
  uploadMedia,
  type ApiBody,
  type TestServer,
} from '../../test/helpers.js';

const env = loadTestEnv();

// JPG 3000×1500 "deitado" (orientação EXIF 6 = girar 90°) e com metadados para remover
const photo = () =>
  sharp({ create: { width: 3000, height: 1500, channels: 3, background: '#3366ff' } })
    .jpeg()
    .withExif({ IFD0: { Copyright: 'metadado-secreto' } })
    .withMetadata({ orientation: 6 })
    .toBuffer();

const smallPng = () =>
  sharp({ create: { width: 40, height: 30, channels: 3, background: '#ff0000' } })
    .png()
    .toBuffer();

describe('media', () => {
  const { pool, db } = createDb(env);
  const revalidator = fakeRevalidator();
  let api: TestServer;
  let limitedApi: TestServer;
  let cookie: string;

  const listFiles = async () =>
    (await readdir(env.UPLOAD_DIR, { recursive: true, withFileTypes: true }).catch(() => []))
      .filter((entry) => entry.isFile())
      .map((entry) => path.relative(env.UPLOAD_DIR, path.join(entry.parentPath, entry.name)));

  beforeAll(async () => {
    const options = { env, db, bcryptCost: TEST_BCRYPT_COST, revalidator };
    api = await listen(createApp(options));
    limitedApi = await listen(
      createApp({ ...options, mediaLimits: { imageBytes: 2_000, videoBytes: 4_000 } }),
    );
  });

  beforeEach(async () => {
    await resetAndBootstrap(env);
    await rm(env.UPLOAD_DIR, { recursive: true, force: true });
    cookie = await signInAdmin(api.baseUrl);
    revalidator.tags.length = 0;
  });

  afterAll(async () => {
    await Promise.all([api.close(), limitedApi.close()]);
    await pool.end();
  });

  it('requires an admin session', async () => {
    expect((await get(api.baseUrl, '/media')).status).toBe(401);
    expect((await uploadMedia(api.baseUrl, '', { data: await smallPng() })).status).toBe(401);
  });

  it('converts an image into a single WebP of up to 1920 px, rotated and without metadata', async () => {
    const response = await uploadMedia(api.baseUrl, cookie, {
      data: await photo(),
      name: 'foto.jpg',
      type: 'image/jpeg',
    });
    const item = await readBody<MediaItem>(response);

    expect(response.status).toBe(201);
    // Girada pela orientação: fica em pé, com a maior largura possível até 1500 px
    expect(item).toMatchObject({ kind: 'image', mime: 'image/webp', width: 1500, height: 3000 });
    expect(item.url).toMatch(/^\/uploads\/[a-f0-9-]{36}\/image\.webp$/);

    const file = await get(api.baseUrl, item.url);
    const data = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(data).metadata();
    expect(file.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(file.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
    expect(metadata).toMatchObject({ format: 'webp', width: 1500, height: 3000 });
    expect(metadata.exif).toBeUndefined();
    expect(data.includes('metadado-secreto')).toBe(false);

    // Só o arquivo final: nada sobra na pasta temporária
    expect(await listFiles()).toEqual([
      item.url.replace('/uploads/', '').split('/').join(path.sep),
    ]);
  });

  it('caps wide images at 1920 px', async () => {
    const wide = await sharp({
      create: { width: 4000, height: 1000, channels: 3, background: '#000' },
    })
      .png()
      .toBuffer();
    const item = await readBody<MediaItem>(await uploadMedia(api.baseUrl, cookie, { data: wide }));

    expect(item).toMatchObject({ width: 1920, height: 480 });
  });

  it('identifies files by content, not by name or declared type', async () => {
    const fakeJpeg = await uploadMedia(api.baseUrl, cookie, {
      data: Buffer.from('<script>alert(1)</script>'),
      name: 'foto.jpg',
      type: 'image/jpeg',
    });
    const avifAsVideo = await uploadMedia(api.baseUrl, cookie, {
      data: fakeMp4('avif'),
      name: 'video.mp4',
      type: 'video/mp4',
    });
    const mp4WithWrongName = await uploadMedia(api.baseUrl, cookie, {
      data: fakeMp4(),
      name: 'foto.png',
      type: 'image/png',
    });

    expect(fakeJpeg.status).toBe(415);
    expect(await readBody(fakeJpeg)).toMatchObject({ error: { code: 'UNSUPPORTED_MEDIA' } });
    expect(avifAsVideo.status).toBe(415);
    expect(mp4WithWrongName.status).toBe(201);
    expect(await readBody(mp4WithWrongName)).toMatchObject({
      kind: 'video',
      mime: 'video/mp4',
      width: null,
    });
    expect(await listFiles()).toHaveLength(1);
  });

  it('requires a file and the alternative text', async () => {
    const noAlt = await uploadMedia(api.baseUrl, cookie, { data: await smallPng() }, '  ');
    const noFile = await fetch(`${api.baseUrl}/media`, {
      method: 'POST',
      headers: { cookie },
      body: new FormData(),
    });

    expect(noAlt.status).toBe(400);
    expect((await readBody<ApiBody>(noAlt)).error?.fields?.['alt']).toBeDefined();
    expect(noFile.status).toBe(400);
    expect(await readBody(noFile)).toMatchObject({ error: { code: 'FILE_REQUIRED' } });
    expect(await listFiles()).toEqual([]);
  });

  it('enforces the size limit of each kind', async () => {
    // Limites do limitedApi: imagem 2 KB, vídeo 4 KB
    const image = await uploadMedia(limitedApi.baseUrl, cookie, { data: Buffer.alloc(3_000) });
    const video = await uploadMedia(limitedApi.baseUrl, cookie, { data: fakeMp4('isom', 3_000) });
    const tooBig = await uploadMedia(limitedApi.baseUrl, cookie, { data: fakeMp4('isom', 5_000) });

    expect(image.status).toBe(413);
    expect(await readBody(image)).toMatchObject({ error: { code: 'FILE_TOO_LARGE' } });
    expect(video.status).toBe(201);
    expect(tooBig.status).toBe(413);
    expect((await listFiles()).filter((file) => file.startsWith(TMP_FOLDER))).toEqual([]);
  });

  it('lists newest first, with pagination and a kind filter', async () => {
    for (let index = 0; index < 3; index++) {
      await uploadMedia(api.baseUrl, cookie, { data: await smallPng() }, `Imagem ${index}`);
    }
    await uploadMedia(api.baseUrl, cookie, { data: fakeMp4() }, 'Vídeo');

    const page = await readBody<MediaList>(await get(api.baseUrl, '/media?pageSize=2', cookie));
    const images = await readBody<MediaList>(await get(api.baseUrl, '/media?kind=image', cookie));
    const invalid = await get(api.baseUrl, '/media?kind=pdf', cookie);

    expect(page.total).toBe(4);
    expect(page.items.map((item) => item.alt)).toEqual(['Vídeo', 'Imagem 2']);
    expect(images.total).toBe(3);
    expect(images.items.every((item) => item.kind === 'image')).toBe(true);
    expect(invalid.status).toBe(400);
  });

  it('updates the alternative text and revalidates the sections that use the media', async () => {
    const item = await readBody<MediaItem>(
      await uploadMedia(api.baseUrl, cookie, { data: await smallPng() }),
    );
    await send('PUT', api.baseUrl, '/sections/header', { logo: item.id }, cookie);
    revalidator.tags.length = 0;

    const updated = await send('PATCH', api.baseUrl, `/media/${item.id}`, { alt: 'Logo' }, cookie);
    const missing = await send('PATCH', api.baseUrl, '/media/9999', { alt: 'Logo' }, cookie);

    expect(await readBody(updated)).toMatchObject({ id: item.id, alt: 'Logo' });
    expect(revalidator.tags).toEqual(['section:header']);
    expect(missing.status).toBe(404);
  });

  it('blocks deleting media in use and deletes the file otherwise', async () => {
    const item = await readBody<MediaItem>(
      await uploadMedia(api.baseUrl, cookie, { data: await smallPng() }),
    );
    await send('PUT', api.baseUrl, '/sections/seo', { shareImage: item.id }, cookie);
    const remove = () =>
      fetch(`${api.baseUrl}/media/${item.id}`, { method: 'DELETE', headers: { cookie } });

    const blocked = await remove();
    expect(blocked.status).toBe(409);
    expect(await readBody(blocked)).toMatchObject({
      error: {
        code: 'MEDIA_IN_USE',
        details: { usage: [{ type: 'section', key: 'seo', label: 'SEO global' }] },
      },
    });

    await send('PUT', api.baseUrl, '/sections/seo', { shareImage: null }, cookie);
    expect((await remove()).status).toBe(204);
    expect((await get(api.baseUrl, item.url)).status).toBe(404);
    expect(await listFiles()).toEqual([]);
  });

  it('never serves the temporary folder or paths outside the uploads', async () => {
    const tmp = await get(api.baseUrl, `/uploads/${TMP_FOLDER}/qualquer`);
    const traversal = await get(api.baseUrl, '/uploads/..%2f..%2f.env');

    expect(tmp.status).toBe(404);
    expect([400, 403, 404]).toContain(traversal.status);
  });
});
