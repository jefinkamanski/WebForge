import type {
  MediaItem,
  PostEdit,
  PostList,
  PostSlug,
  PublicPost,
  PublicPostList,
} from '@webforge/shared';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { createDb } from '../../db/client.js';
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

const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const doc = (...content: unknown[]) => ({ type: 'doc', content });

const draft = (overrides: Record<string, unknown> = {}) => ({
  title: 'Primeiro post',
  slug: 'primeiro-post',
  content: doc(paragraph('Olá, mundo! Este é o texto do post.')),
  ...overrides,
});

describe('posts', () => {
  const { pool, db } = createDb(env);
  const revalidator = fakeRevalidator();
  let api: TestServer;
  let cookie: string;

  const create = async (body: unknown) => send('POST', api.baseUrl, '/posts', body, cookie);
  const createOk = async (body: unknown) => readBody<PostEdit>(await create(body));
  const update = (id: number, body: unknown) =>
    send('PUT', api.baseUrl, `/posts/${id}`, body, cookie);
  const remove = (path: string) =>
    fetch(`${api.baseUrl}${path}`, { method: 'DELETE', headers: { cookie } });
  const image = async (alt = 'Foto') =>
    readBody<MediaItem>(
      await uploadMedia(
        api.baseUrl,
        cookie,
        {
          data: await sharp({
            create: { width: 80, height: 40, channels: 3, background: '#336699' },
          })
            .png()
            .toBuffer(),
        },
        alt,
      ),
    );
  const publicList = async () => readBody<PublicPostList>(await get(api.baseUrl, '/site/posts'));

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

  it('requires an admin session for the panel routes', async () => {
    expect((await get(api.baseUrl, '/posts')).status).toBe(401);
    expect((await send('POST', api.baseUrl, '/posts', draft())).status).toBe(401);
  });

  it('creates a draft that the site does not see', async () => {
    const response = await create(draft());
    const { post } = await readBody<PostEdit>(response);

    expect(response.status).toBe(201);
    expect(post).toMatchObject({ status: 'draft', publishedAt: null, excerpt: '', cover: null });
    expect(revalidator.tags).toEqual([]);
    expect((await publicList()).total).toBe(0);
    expect((await get(api.baseUrl, '/site/posts/primeiro-post')).status).toBe(404);
  });

  it('validates the slug, the content and refuses a repeated address', async () => {
    await createOk(draft());
    const repeated = await readBody<ApiBody>(await create(draft({ title: 'Outro' })));
    const invalid = await readBody<ApiBody>(
      await create(
        draft({
          slug: 'Com Espaço',
          content: doc(
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'clique',
                  marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
                },
              ],
            },
            { type: 'codeBlock' },
          ),
        }),
      ),
    );

    expect(repeated.error?.fields).toEqual({ slug: ['Já existe um post com este endereço.'] });
    expect(Object.keys(invalid.error?.fields ?? {}).sort()).toEqual(
      ['content.content.0.content.0.marks.0.attrs.href', 'content.content.1.type', 'slug'].sort(),
    );
  });

  it('accepts long texts beyond the global 100 kB limit', async () => {
    const long = Array.from({ length: 80 }, (_, index) =>
      paragraph(`${index} ${'texto '.repeat(500)}`),
    );
    const response = await create(draft({ content: doc(...long) }));

    expect(response.status).toBe(201);
  });

  it('publishes with a date, revalidates the site and keeps the date when republishing', async () => {
    const { post } = await createOk(draft());
    const published = await readBody<PostEdit>(
      await update(post.id, draft({ status: 'published' })),
    );
    const firstDate = published.post.publishedAt;

    expect(firstDate).not.toBeNull();
    expect(revalidator.tags).toEqual(['posts']);
    expect(await publicList()).toMatchObject({
      total: 1,
      items: [{ slug: 'primeiro-post', excerpt: 'Olá, mundo! Este é o texto do post.' }],
    });

    await update(post.id, draft({ status: 'draft' }));
    expect((await publicList()).total).toBe(0);
    const again = await readBody<PostEdit>(await update(post.id, draft({ status: 'published' })));
    expect(again.post.publishedAt).toBe(firstDate);
  });

  it('resolves the cover and text images for the site and checks they are images', async () => {
    const cover = await image('Capa');
    const inline = await image('No meio do texto');
    const video = await readBody<MediaItem>(
      await uploadMedia(api.baseUrl, cookie, { data: fakeMp4() }),
    );

    const wrongCover = await readBody<ApiBody>(await create(draft({ cover: video.id })));
    const missingInline = await readBody<ApiBody>(
      await create(draft({ content: doc({ type: 'image', attrs: { mediaId: 9999 } }) })),
    );
    expect(Object.keys(wrongCover.error?.fields ?? {})).toEqual(['cover']);
    expect(Object.keys(missingInline.error?.fields ?? {})).toEqual(['content']);

    const { post, media } = await createOk(
      draft({
        status: 'published',
        cover: cover.id,
        excerpt: 'Resumo escrito',
        content: doc(paragraph('Antes'), { type: 'image', attrs: { mediaId: inline.id } }),
      }),
    );
    expect(Object.keys(media).sort()).toEqual([String(cover.id), String(inline.id)].sort());

    const page = await readBody<PublicPost>(await get(api.baseUrl, `/site/posts/${post.slug}`));
    expect(page.cover).toEqual({ url: cover.url, width: 80, height: 40, alt: 'Capa' });
    expect(page.excerpt).toBe('Resumo escrito');
    expect(page.content.content[1]).toEqual({
      type: 'image',
      attrs: { url: inline.url, width: 80, height: 40, alt: 'No meio do texto' },
    });
  });

  it('lists the site posts newest first, with pagination and slugs for the sitemap', async () => {
    for (const index of [1, 2, 3]) {
      await createOk(draft({ title: `Post ${index}`, slug: `post-${index}`, status: 'published' }));
    }
    await createOk(draft({ slug: 'rascunho' }));

    const page = await readBody<PublicPostList>(await get(api.baseUrl, '/site/posts?pageSize=2'));
    const slugs = await readBody<PostSlug[]>(await get(api.baseUrl, '/site/posts/slugs'));
    const panel = await readBody<PostList>(await get(api.baseUrl, '/posts?status=draft', cookie));

    expect(page.total).toBe(3);
    expect(page.items.map((item) => item.slug)).toEqual(['post-3', 'post-2']);
    expect(slugs.map((item) => item.slug)).toEqual(['post-3', 'post-2', 'post-1']);
    expect(panel.items.map((item) => item.slug)).toEqual(['rascunho']);
  });

  it('moves to the trash, restores and only deletes permanently from the trash', async () => {
    const { post } = await createOk(draft({ status: 'published' }));
    revalidator.tags.length = 0;

    expect((await remove(`/posts/${post.id}/permanent`)).status).toBe(409);
    expect((await remove(`/posts/${post.id}`)).status).toBe(204);
    expect(revalidator.tags).toEqual(['posts']);
    expect((await publicList()).total).toBe(0);
    expect((await update(post.id, draft())).status).toBe(409);

    const trash = await readBody<PostList>(await get(api.baseUrl, '/posts?view=trash', cookie));
    expect(trash.items.map((item) => item.id)).toEqual([post.id]);

    await send('POST', api.baseUrl, `/posts/${post.id}/restore`, {}, cookie);
    expect((await publicList()).total).toBe(1);

    await remove(`/posts/${post.id}`);
    expect((await remove(`/posts/${post.id}/permanent`)).status).toBe(204);
    expect((await get(api.baseUrl, `/posts/${post.id}`, cookie)).status).toBe(404);
  });

  it('blocks deleting media used by a post, even in the trash', async () => {
    const cover = await image();
    const inline = await image();
    const { post } = await createOk(
      draft({ cover: cover.id, content: doc({ type: 'image', attrs: { mediaId: inline.id } }) }),
    );
    await remove(`/posts/${post.id}`);

    for (const item of [cover, inline]) {
      const blocked = await remove(`/media/${item.id}`);
      expect(blocked.status).toBe(409);
      expect(await readBody(blocked)).toMatchObject({
        error: {
          details: {
            usage: [
              { type: 'post', key: String(post.id), label: 'Post "Primeiro post" (na lixeira)' },
            ],
          },
        },
      });
    }

    await remove(`/posts/${post.id}/permanent`);
    expect((await remove(`/media/${cover.id}`)).status).toBe(204);
  });
});
