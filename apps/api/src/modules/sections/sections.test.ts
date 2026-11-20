import { sections, type MediaItem, type SectionEdit, type SiteContent } from '@webforge/shared';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { createDb } from '../../db/client.js';
import { media, siteSections } from '../../db/schema.js';
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

describe('sections', () => {
  const { pool, db } = createDb(env);
  const revalidator = fakeRevalidator();
  let api: TestServer;
  let cookie: string;

  const put = (key: string, body: unknown, session = cookie) =>
    send('PUT', api.baseUrl, `/sections/${key}`, body, session);
  const site = async () => readBody<SiteContent>(await get(api.baseUrl, '/site'));
  const upload = async (data: Uint8Array, alt = 'Descrição') =>
    readBody<MediaItem>(await uploadMedia(api.baseUrl, cookie, { data }, alt));
  const image = () =>
    sharp({ create: { width: 64, height: 32, channels: 3, background: '#123456' } })
      .png()
      .toBuffer();

  beforeAll(async () => {
    api = await listen(createApp({ env, db, bcryptCost: TEST_BCRYPT_COST, revalidator }));
  });

  beforeEach(async () => {
    await resetAndBootstrap(env);
    cookie = await signInAdmin(api.baseUrl);
    revalidator.tags.length = 0;
  });

  afterAll(async () => {
    await api.close();
    await pool.end();
  });

  it('serves every section with its defaults while nothing is saved, without login', async () => {
    expect(await site()).toEqual({
      header: sections.header.defaults,
      hero: sections.hero.defaults,
      footer: sections.footer.defaults,
      seo: sections.seo.defaults,
    });
  });

  it('requires an admin session to read or save a section for editing', async () => {
    expect((await get(api.baseUrl, '/sections/hero')).status).toBe(401);
    expect((await put('hero', { title: 'Oi' }, '')).status).toBe(401);
  });

  it('answers 404 for a section that is not registered', async () => {
    expect((await put('inexistente', {})).status).toBe(404);
    expect((await get(api.baseUrl, '/sections/__proto__', cookie)).status).toBe(404);
  });

  it('saves, fills missing fields with defaults and asks the site to revalidate', async () => {
    const saved = await put('footer', { text: '  Feito com carinho  ' });
    const edit = await readBody<SectionEdit<'footer'>>(
      await get(api.baseUrl, '/sections/footer', cookie),
    );

    expect(saved.status).toBe(200);
    expect(edit).toEqual({ content: { text: 'Feito com carinho', links: [] }, media: {} });
    expect(revalidator.tags).toEqual(['section:footer']);
    expect((await site()).footer.text).toBe('Feito com carinho');

    await put('footer', { text: 'Atualizado' });
    expect((await site()).footer.text).toBe('Atualizado');
  });

  it('reports invalid fields by path and saves nothing', async () => {
    const response = await put('header', {
      navItems: [
        { label: 'Início', href: '/' },
        { label: 'XSS', href: 'javascript:alert(1)' },
      ],
    });
    const body = await readBody<ApiBody>(response);

    expect(response.status).toBe(400);
    expect(Object.keys(body.error?.fields ?? {})).toEqual(['navItems.1.href']);
    expect(revalidator.tags).toEqual([]);
    expect((await site()).header).toEqual(sections.header.defaults);
  });

  it('requires a poster when the hero has a video', async () => {
    const video = await upload(fakeMp4());
    const body = await readBody<ApiBody>(await put('hero', { video: video.id }));

    expect(body.error?.fields?.['poster']).toEqual(['Escolha um poster para o vídeo']);
  });

  it('rejects media that does not exist or is of the wrong kind', async () => {
    const video = await upload(fakeMp4());
    const response = await put('hero', { video: 9999, poster: video.id });
    const body = await readBody<ApiBody>(response);

    expect(response.status).toBe(400);
    expect(body.error?.fields).toEqual({
      video: ['Mídia não encontrada.'],
      poster: ['Escolha uma imagem.'],
    });
  });

  it('returns the cited media for editing and resolves it for the site', async () => {
    const poster = await upload(await image(), 'Equipe reunida');
    const video = await upload(fakeMp4(), 'Escritório');
    await put('hero', { title: 'Olá', video: video.id, poster: poster.id });

    const edit = await readBody<SectionEdit<'hero'>>(
      await get(api.baseUrl, '/sections/hero', cookie),
    );
    const { hero } = await site();

    expect(edit.content).toMatchObject({ video: video.id, poster: poster.id });
    expect(Object.keys(edit.media).sort()).toEqual([String(poster.id), String(video.id)].sort());
    expect(hero.poster).toEqual({ url: poster.url, width: 64, height: 32, alt: 'Equipe reunida' });
    expect(hero.video).toEqual({ url: video.url, mime: 'video/mp4', alt: 'Escritório' });
  });

  it('falls back to defaults (with a warning) when saved content no longer fits the schema', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await db.insert(siteSections).values({ key: 'seo', content: { siteName: 42 } });
    await db.insert(siteSections).values({ key: 'footer', content: { links: [] } });

    const content = await site();

    expect(content.seo).toEqual(sections.seo.defaults);
    // Campo ausente (seção antiga sem "text") recebe o padrão sem aviso
    expect(content.footer).toEqual(sections.footer.defaults);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('"seo"');
    warn.mockRestore();
  });

  it('serves null for media removed outside the panel', async () => {
    const logo = await upload(await image());
    await put('header', { logo: logo.id });
    await db.delete(media).where(eq(media.id, logo.id));

    expect((await site()).header.logo).toBeNull();
  });
});
