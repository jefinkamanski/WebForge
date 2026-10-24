import {
  collectMediaRefs,
  type ListMediaQuery,
  type MediaListResponse,
  type MediaResponse,
  type MediaUsage,
} from '@site/shared';
import { count, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { z } from 'zod';
import type { Db } from '../../db/client.js';
import { media, posts, siteSections } from '../../db/schema.js';
import { HttpError } from '../../http/errors.js';
import type { StorageProvider } from '../../storage/storage.js';
import { processImage } from './image-processor.js';
import { sniffVideo } from './sniff.js';

type MediaRow = typeof media.$inferSelect;

const storedVariantsSchema = z.array(
  z.object({ width: z.number(), height: z.number(), key: z.string() }),
);

export interface MediaLimits {
  imageBytes: number;
  videoBytes: number;
}

export interface UploadInput {
  filePath: string;
  alt: string;
}

const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));

// Em MariaDB o tipo JSON é texto: aceita as duas formas
function parseVariants(value: unknown) {
  const raw = typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
  const parsed = storedVariantsSchema.safeParse(raw ?? []);
  return parsed.success ? parsed.data : [];
}

function isForeignKeyViolation(error: unknown): boolean {
  let current: unknown = error;
  while (typeof current === 'object' && current !== null) {
    if ('errno' in current && current.errno === 1451) return true;
    current = 'cause' in current ? current.cause : null;
  }
  return false;
}

export function createMediaService(db: Db, storage: StorageProvider, limits: MediaLimits) {
  function toResponse(row: MediaRow): MediaResponse {
    return {
      id: row.id,
      kind: row.kind,
      mime: row.mime,
      size: row.size,
      width: row.width,
      height: row.height,
      alt: row.alt,
      url: storage.publicPath(row.storageKey),
      variants: parseVariants(row.variants).map((variant) => ({
        width: variant.width,
        height: variant.height,
        url: storage.publicPath(variant.key),
      })),
      createdAt: row.createdAt.toISOString(),
    };
  }

  async function findRow(id: number): Promise<MediaRow> {
    const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
    if (!row) throw new HttpError(404, 'MEDIA_NOT_FOUND', 'Mídia não encontrada.');
    return row;
  }

  async function uploadVideo(
    { filePath, alt }: UploadInput,
    mime: 'video/mp4' | 'video/webm',
    size: number,
  ) {
    if (size > limits.videoBytes) {
      throw new HttpError(
        413,
        'FILE_TOO_LARGE',
        `O vídeo excede o limite de ${mb(limits.videoBytes)} MB.`,
      );
    }

    const folder = randomUUID();
    const key = `${folder}/video.${mime === 'video/mp4' ? 'mp4' : 'webm'}`;
    await storage.saveFile(key, filePath);

    try {
      const [result] = await db
        .insert(media)
        .values({ kind: 'video', storageKey: key, mime, size, alt, variants: [] })
        .$returningId();
      return findRow(result?.id ?? 0);
    } catch (error) {
      await storage.removePrefix(folder);
      throw error;
    }
  }

  async function uploadImage({ filePath, alt }: UploadInput, size: number) {
    if (size > limits.imageBytes) {
      throw new HttpError(
        413,
        'FILE_TOO_LARGE',
        `A imagem excede o limite de ${mb(limits.imageBytes)} MB.`,
      );
    }

    const processed = await processImage(filePath);
    const folder = randomUUID();
    const stored = processed.map((variant) => ({
      width: variant.width,
      height: variant.height,
      key: `${folder}/${variant.width}.webp`,
      data: variant.data,
    }));

    try {
      for (const variant of stored) {
        await storage.saveBuffer(variant.key, variant.data);
      }
      const largest = stored[stored.length - 1];
      if (!largest) throw new HttpError(415, 'UNSUPPORTED_MEDIA', 'Imagem inválida.');

      const [result] = await db
        .insert(media)
        .values({
          kind: 'image',
          storageKey: largest.key,
          mime: 'image/webp',
          size: largest.data.length,
          width: largest.width,
          height: largest.height,
          alt,
          variants: stored.map(({ width, height, key }) => ({ width, height, key })),
        })
        .$returningId();
      return findRow(result?.id ?? 0);
    } catch (error) {
      await storage.removePrefix(folder);
      throw error;
    }
  }

  async function findUsage(id: number): Promise<MediaUsage[]> {
    const usage: MediaUsage[] = [];

    for (const section of await db.select().from(siteSections)) {
      const content: unknown =
        typeof section.content === 'string' ? JSON.parse(section.content) : section.content;
      if (collectMediaRefs(content).some((ref) => ref.id === id)) {
        usage.push({ type: 'section', id: section.key, label: `Seção "${section.key}"` });
      }
    }

    const covered = await db
      .select({ id: posts.id, title: posts.title })
      .from(posts)
      .where(eq(posts.coverMediaId, id));
    for (const post of covered) {
      usage.push({ type: 'post', id: String(post.id), label: `Capa do post "${post.title}"` });
    }
    return usage;
  }

  function blockedByUsage(usage: MediaUsage[]): HttpError {
    return new HttpError(409, 'MEDIA_IN_USE', 'A mídia está em uso e não pode ser excluída.', {
      usage,
    });
  }

  return {
    toResponse,

    limits: () => limits,

    async upload(input: UploadInput): Promise<MediaResponse> {
      const { size } = await stat(input.filePath);
      const videoMime = await sniffVideo(input.filePath);
      const row = videoMime
        ? await uploadVideo(input, videoMime, size)
        : await uploadImage(input, size);
      return toResponse(row);
    },

    async list({ page, pageSize, kind }: ListMediaQuery): Promise<MediaListResponse> {
      const where = kind ? eq(media.kind, kind) : undefined;
      const [totalRow] = await db.select({ total: count() }).from(media).where(where);
      const rows = await db
        .select()
        .from(media)
        .where(where)
        .orderBy(desc(media.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      return { items: rows.map(toResponse), page, pageSize, total: totalRow?.total ?? 0 };
    },

    async get(id: number): Promise<MediaResponse> {
      return toResponse(await findRow(id));
    },

    async updateAlt(id: number, alt: string): Promise<MediaResponse> {
      await findRow(id);
      await db.update(media).set({ alt }).where(eq(media.id, id));
      return toResponse(await findRow(id));
    },

    async usage(id: number): Promise<MediaUsage[]> {
      await findRow(id);
      return findUsage(id);
    },

    async remove(id: number): Promise<void> {
      const row = await findRow(id);

      const usage = await findUsage(id);
      if (usage.length > 0) throw blockedByUsage(usage);

      try {
        await db.delete(media).where(eq(media.id, id));
      } catch (error) {
        if (isForeignKeyViolation(error)) throw blockedByUsage(await findUsage(id));
        throw error;
      }

      const folder = row.storageKey.split('/')[0];
      if (folder) await storage.removePrefix(folder);
    },
  };
}

export type MediaService = ReturnType<typeof createMediaService>;
