import {
  EMPTY_POST_DOC,
  mapPostImages,
  postDocSchema,
  postImageIds,
  postInputSchema,
  postPlainText,
  type ImageAsset,
  type ListPostsQuery,
  type MediaItem,
  type MediaUsage,
  type Post,
  type PostDoc,
  type PostEdit,
  type PostList,
  type PostSlug,
  type PostSummary,
  type PublicPost,
  type PublicPostList,
  type PublicPostSummary,
} from '@webforge/shared';
import { and, count, desc, eq, inArray, isNotNull, isNull, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../db/client.js';
import { media, posts } from '../../db/schema.js';
import { HttpError } from '../../http/errors.js';
import { toMediaItem, type MediaRow } from '../media/media.service.js';
import type { Revalidator } from '../revalidation/revalidator.js';

type PostRow = typeof posts.$inferSelect;

// Tag do Next.js usada pela lista, pelas páginas dos posts e pelo sitemap
export const POSTS_TAG = 'posts';

const iso = (date: Date) => date.toISOString();

// Leitura tolerante, como nas seções: conteúdo inválido vira texto vazio, com aviso
function readContent(row: Pick<PostRow, 'id' | 'content'>): PostDoc {
  try {
    const raw: unknown = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
    const parsed = postDocSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  } catch {
    // JSON corrompido: cai no padrão abaixo
  }
  console.warn(`Post ${row.id}: conteúdo salvo inválido; usando texto vazio.`);
  return EMPTY_POST_DOC;
}

function toPost(row: PostRow): Post {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    cover: row.coverMediaId as Post['cover'],
    content: readContent(row),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    status: row.status,
    publishedAt: row.publishedAt ? iso(row.publishedAt) : null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    deletedAt: row.deletedAt ? iso(row.deletedAt) : null,
  };
}

function toSummary(row: PostRow): PostSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    publishedAt: row.publishedAt ? iso(row.publishedAt) : null,
    updatedAt: iso(row.updatedAt),
    deletedAt: row.deletedAt ? iso(row.deletedAt) : null,
  };
}

const toImageAsset = (row: MediaRow): ImageAsset => ({
  url: toMediaItem(row).url,
  width: row.width ?? 0,
  height: row.height ?? 0,
  alt: row.alt,
});

function isDuplicateEntry(error: unknown): boolean {
  let current: unknown = error;
  while (typeof current === 'object' && current !== null) {
    if ('errno' in current && current.errno === 1062) return true;
    current = 'cause' in current ? current.cause : null;
  }
  return false;
}

const fieldError = (path: string, message: string, input: unknown) =>
  new z.ZodError([{ code: 'custom', path: path.split('.'), message, input }]);

// Publicado e fora da lixeira: o que o site mostra
const isPublic = and(eq(posts.status, 'published'), isNull(posts.deletedAt));

export function createPostsService(db: Db, revalidator: Revalidator) {
  async function findRow(id: number): Promise<PostRow> {
    const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!row) throw new HttpError(404, 'POST_NOT_FOUND', 'Post não encontrado.');
    return row;
  }

  async function findImages(ids: number[]): Promise<Map<number, MediaRow>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const rows = await db.select().from(media).where(inArray(media.id, unique));
    return new Map(rows.filter((row) => row.kind === 'image').map((row) => [row.id, row]));
  }

  async function toEdit(row: PostRow): Promise<PostEdit> {
    const post = toPost(row);
    const images = await findImages([
      ...(post.cover ? [post.cover] : []),
      ...postImageIds(post.content),
    ]);
    const mediaById: Record<number, MediaItem> = {};
    for (const [id, image] of images) mediaById[id] = toMediaItem(image);
    return { post, media: mediaById };
  }

  // Capa e imagens do texto precisam existir e ser imagens
  async function assertImages(fields: z.output<typeof postInputSchema>): Promise<void> {
    const images = await findImages([
      ...(fields.cover ? [fields.cover] : []),
      ...postImageIds(fields.content),
    ]);
    if (fields.cover && !images.has(fields.cover)) {
      throw fieldError('cover', 'Escolha uma imagem da biblioteca.', fields.cover);
    }
    if (postImageIds(fields.content).some((id) => !images.has(id))) {
      throw fieldError('content', 'Uma imagem do texto não existe mais na biblioteca.', null);
    }
  }

  async function save(body: unknown, current?: PostRow): Promise<PostEdit> {
    const fields = postInputSchema.parse(body);
    await assertImages(fields);

    const values = {
      title: fields.title,
      slug: fields.slug,
      excerpt: fields.excerpt,
      content: fields.content,
      coverMediaId: fields.cover,
      seoTitle: fields.seoTitle,
      seoDescription: fields.seoDescription,
      status: fields.status,
      // A data de publicação é a da primeira vez; despublicar e republicar a mantém
      publishedAt:
        fields.status === 'published'
          ? (current?.publishedAt ?? new Date())
          : (current?.publishedAt ?? null),
    };

    let id = current?.id;
    try {
      if (current) {
        await db.update(posts).set(values).where(eq(posts.id, current.id));
      } else {
        const [created] = await db.insert(posts).values(values).$returningId();
        id = created?.id;
      }
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw fieldError('slug', 'Já existe um post com este endereço.', fields.slug);
      }
      throw error;
    }

    if (current?.status === 'published' || fields.status === 'published') {
      await revalidator.revalidate([POSTS_TAG]);
    }
    return toEdit(await findRow(id ?? 0));
  }

  // Mídias das capas e do texto de uma página de posts, numa consulta só
  async function resolveSummaries(rows: PostRow[]): Promise<PublicPostSummary[]> {
    const images = await findImages(
      rows.flatMap((row) => (row.coverMediaId ? [row.coverMediaId] : [])),
    );
    return rows.map((row) => {
      const cover = row.coverMediaId ? images.get(row.coverMediaId) : undefined;
      return {
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt || postPlainText(readContent(row), 200),
        cover: cover ? toImageAsset(cover) : null,
        publishedAt: iso(row.publishedAt ?? row.createdAt),
        updatedAt: iso(row.updatedAt),
      };
    });
  }

  return {
    async list({ page, pageSize, status, view }: ListPostsQuery): Promise<PostList> {
      const filters: SQL[] = [
        view === 'trash' ? isNotNull(posts.deletedAt) : isNull(posts.deletedAt),
      ];
      if (status) filters.push(eq(posts.status, status));
      const where = and(...filters);

      const [totals] = await db.select({ total: count() }).from(posts).where(where);
      const rows = await db
        .select()
        .from(posts)
        .where(where)
        .orderBy(desc(posts.updatedAt), desc(posts.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      return { items: rows.map(toSummary), page, pageSize, total: totals?.total ?? 0 };
    },

    async get(id: number): Promise<PostEdit> {
      return toEdit(await findRow(id));
    },

    create: (body: unknown) => save(body),

    async update(id: number, body: unknown): Promise<PostEdit> {
      const current = await findRow(id);
      if (current.deletedAt) {
        throw new HttpError(409, 'POST_IN_TRASH', 'Restaure o post da lixeira antes de editá-lo.');
      }
      return save(body, current);
    },

    // Excluir manda para a lixeira: some do site, mas pode ser restaurado
    async trash(id: number): Promise<void> {
      const row = await findRow(id);
      if (row.deletedAt) return;
      await db.update(posts).set({ deletedAt: new Date() }).where(eq(posts.id, id));
      if (row.status === 'published') await revalidator.revalidate([POSTS_TAG]);
    },

    async restore(id: number): Promise<PostEdit> {
      const row = await findRow(id);
      if (row.deletedAt) {
        await db.update(posts).set({ deletedAt: null }).where(eq(posts.id, id));
        if (row.status === 'published') await revalidator.revalidate([POSTS_TAG]);
      }
      return toEdit(await findRow(id));
    },

    // Exclusão definitiva: só para posts que já estão na lixeira
    async destroy(id: number): Promise<void> {
      const row = await findRow(id);
      if (!row.deletedAt) {
        throw new HttpError(
          409,
          'POST_NOT_IN_TRASH',
          'Mova o post para a lixeira antes de excluí-lo.',
        );
      }
      await db.delete(posts).where(eq(posts.id, id));
    },

    // ===== Site (só posts publicados e fora da lixeira) =====

    async listPublished({
      page,
      pageSize,
    }: {
      page: number;
      pageSize: number;
    }): Promise<PublicPostList> {
      const [totals] = await db.select({ total: count() }).from(posts).where(isPublic);
      const rows = await db
        .select()
        .from(posts)
        .where(isPublic)
        .orderBy(desc(posts.publishedAt), desc(posts.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      return { items: await resolveSummaries(rows), page, pageSize, total: totals?.total ?? 0 };
    },

    async getPublished(slug: string): Promise<PublicPost> {
      const [row] = await db
        .select()
        .from(posts)
        .where(and(isPublic, eq(posts.slug, slug)))
        .limit(1);
      if (!row) throw new HttpError(404, 'POST_NOT_FOUND', 'Post não encontrado.');

      const content = readContent(row);
      const images = await findImages(postImageIds(content));
      const [summary] = await resolveSummaries([row]);
      return {
        ...(summary as PublicPostSummary),
        // Imagem que sumiu da biblioteca sai do texto em vez de quebrar a página
        content: mapPostImages(content, ({ mediaId }) => {
          const image = images.get(mediaId);
          return image ? toImageAsset(image) : null;
        }),
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
      };
    },

    async slugs(): Promise<PostSlug[]> {
      const rows = await db
        .select({ slug: posts.slug, updatedAt: posts.updatedAt })
        .from(posts)
        .where(isPublic)
        .orderBy(desc(posts.publishedAt));
      return rows.map((row) => ({ slug: row.slug, updatedAt: iso(row.updatedAt) }));
    },

    // Posts (inclusive na lixeira) que usam a mídia como capa ou no texto
    async findMediaUsage(id: number): Promise<MediaUsage[]> {
      const rows = await db
        .select({
          id: posts.id,
          title: posts.title,
          coverMediaId: posts.coverMediaId,
          content: posts.content,
          deletedAt: posts.deletedAt,
        })
        .from(posts);
      return rows
        .filter((row) => row.coverMediaId === id || postImageIds(readContent(row)).includes(id))
        .map((row) => ({
          type: 'post' as const,
          key: String(row.id),
          label: `Post "${row.title}"${row.deletedAt ? ' (na lixeira)' : ''}`,
        }));
    },
  };
}

export type PostsService = ReturnType<typeof createPostsService>;
