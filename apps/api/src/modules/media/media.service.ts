import {
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  type ListMediaQuery,
  type MediaItem,
  type MediaList,
  type MediaUsage,
} from '@webforge/shared';
import { count, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import type { Db } from '../../db/client.js';
import { media } from '../../db/schema.js';
import { HttpError } from '../../http/errors.js';
import type { DiskStorage } from '../../storage/disk.js';
import type { Revalidator } from '../revalidation/revalidator.js';
import { convertImage } from './image.js';
import { isMp4 } from './sniff.js';

export type MediaRow = typeof media.$inferSelect;

export const UPLOADS_PATH = '/uploads';

export interface MediaLimits {
  imageBytes: number;
  videoBytes: number;
}

export const DEFAULT_MEDIA_LIMITS: MediaLimits = {
  imageBytes: IMAGE_MAX_BYTES,
  videoBytes: VIDEO_MAX_BYTES,
};

export function toMediaItem(row: MediaRow): MediaItem {
  return {
    id: row.id,
    kind: row.kind,
    url: `${UPLOADS_PATH}/${row.storageKey}`,
    mime: row.mime,
    size: row.size,
    width: row.width,
    height: row.height,
    alt: row.alt,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface MediaServiceDeps {
  db: Db;
  storage: DiskStorage;
  limits: MediaLimits;
  revalidator: Revalidator;
  // Onde a mídia é usada (seções; posts entram na fase 5)
  findUsage: (id: number) => Promise<MediaUsage[]>;
}

export interface UploadInput {
  // Arquivo temporário do multer: sempre apagado ao final, com sucesso ou erro
  filePath: string;
  size: number;
  alt: string;
}

const toMb = (bytes: number) => Math.round(bytes / (1024 * 1024));

function tooLarge(kind: string, limit: number) {
  return new HttpError(413, 'FILE_TOO_LARGE', `${kind} excede o limite de ${toMb(limit)} MB.`);
}

export function createMediaService({
  db,
  storage,
  limits,
  revalidator,
  findUsage,
}: MediaServiceDeps) {
  async function findRow(id: number): Promise<MediaRow> {
    const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
    if (!row) throw new HttpError(404, 'MEDIA_NOT_FOUND', 'Mídia não encontrada.');
    return row;
  }

  // Grava o arquivo e o registro; se o banco falhar, o arquivo não fica órfão
  async function store(
    key: string,
    write: () => Promise<Omit<typeof media.$inferInsert, 'storageKey'>>,
  ) {
    try {
      const values = await write();
      const [created] = await db
        .insert(media)
        .values({ ...values, storageKey: key })
        .$returningId();
      return toMediaItem(await findRow(created?.id ?? 0));
    } catch (error) {
      await storage.remove(key);
      throw error;
    }
  }

  async function revalidateUsage(id: number) {
    const usage = await findUsage(id);
    const tags = new Set(
      usage.map((use) => (use.type === 'post' ? 'posts' : `section:${use.key}`)),
    );
    if (tags.size > 0) await revalidator.revalidate([...tags]);
  }

  return {
    async upload({ filePath, size, alt }: UploadInput): Promise<MediaItem> {
      try {
        const folder = randomUUID();

        if (await isMp4(filePath)) {
          if (size > limits.videoBytes) throw tooLarge('O vídeo', limits.videoBytes);
          const key = `${folder}/video.mp4`;
          return await store(key, async () => {
            await storage.moveIn(filePath, key);
            return { kind: 'video', mime: 'video/mp4', size, alt };
          });
        }

        if (size > limits.imageBytes) throw tooLarge('A imagem', limits.imageBytes);
        const key = `${folder}/image.webp`;
        return await store(key, async () => {
          const image = await convertImage(filePath, await storage.prepare(key));
          return { kind: 'image', mime: 'image/webp', alt, ...image };
        });
      } finally {
        await rm(filePath, { force: true });
      }
    },

    async list({ page, pageSize, kind }: ListMediaQuery): Promise<MediaList> {
      const where = kind ? eq(media.kind, kind) : undefined;
      const [totals] = await db.select({ total: count() }).from(media).where(where);
      const rows = await db
        .select()
        .from(media)
        .where(where)
        .orderBy(desc(media.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      return { items: rows.map(toMediaItem), page, pageSize, total: totals?.total ?? 0 };
    },

    async updateAlt(id: number, alt: string): Promise<MediaItem> {
      await findRow(id);
      await db.update(media).set({ alt }).where(eq(media.id, id));
      // O alt aparece no site: regenera as seções que usam esta mídia
      await revalidateUsage(id);
      return toMediaItem(await findRow(id));
    },

    async remove(id: number): Promise<void> {
      const row = await findRow(id);
      const usage = await findUsage(id);
      if (usage.length > 0) {
        throw new HttpError(409, 'MEDIA_IN_USE', 'A mídia está em uso e não pode ser excluída.', {
          usage,
        });
      }
      await db.delete(media).where(eq(media.id, id));
      await storage.remove(row.storageKey);
    },
  };
}

export type MediaService = ReturnType<typeof createMediaService>;
