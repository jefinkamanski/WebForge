import {
  collectMediaRefs,
  mapMedia,
  sections,
  type ImageAsset,
  type MediaItem,
  type MediaRef,
  type MediaUsage,
  type SectionDefinition,
  type SectionEdit,
  type SectionKey,
  type SiteContent,
  type VideoAsset,
} from '@webforge/shared';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../db/client.js';
import { media, siteSections } from '../../db/schema.js';
import { HttpError } from '../../http/errors.js';
import { toMediaItem, type MediaRow } from '../media/media.service.js';
import type { Revalidator } from '../revalidation/revalidator.js';

const registry = sections as Record<SectionKey, SectionDefinition>;
const sectionKeys = Object.keys(registry) as SectionKey[];

export const sectionTag = (key: string) => `section:${key}`;

export function parseSectionKey(value: unknown): SectionKey {
  if (typeof value !== 'string' || !Object.hasOwn(registry, value)) {
    throw new HttpError(404, 'SECTION_NOT_FOUND', 'Seção não encontrada.');
  }
  return value as SectionKey;
}

// Leitura tolerante: campos ausentes recebem o padrão (.default()). Se o conteúdo salvo
// ainda assim for inválido, usa o padrão da seção e registra um aviso.
function readStored(key: SectionKey, raw: unknown): unknown {
  const definition = registry[key];
  try {
    // Em MariaDB a coluna JSON é texto
    const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const parsed = definition.schema.safeParse(value);
    if (parsed.success) return parsed.data;
  } catch {
    // JSON corrompido: cai no padrão abaixo
  }
  console.warn(`Seção "${key}": conteúdo salvo inválido; usando o padrão.`);
  return definition.defaults;
}

function toAsset(row: MediaRow): ImageAsset | VideoAsset {
  const { url } = toMediaItem(row);
  return row.kind === 'image'
    ? { url, width: row.width ?? 0, height: row.height ?? 0, alt: row.alt }
    : { url, mime: row.mime, alt: row.alt };
}

function mediaError(kind: MediaRef['kind'], found: boolean): string {
  if (!found) return 'Mídia não encontrada.';
  return kind === 'image' ? 'Escolha uma imagem.' : 'Escolha um vídeo.';
}

export function createSectionsService(db: Db, revalidator: Revalidator) {
  async function readAll(): Promise<Map<SectionKey, unknown>> {
    const rows = await db.select().from(siteSections);
    const stored = new Map(rows.map((row) => [row.key, row.content]));
    return new Map(
      sectionKeys.map((key) => [
        key,
        stored.has(key) ? readStored(key, stored.get(key)) : registry[key].defaults,
      ]),
    );
  }

  async function findMedia(refs: MediaRef[]): Promise<Map<number, MediaRow>> {
    const ids = [...new Set(refs.map((ref) => ref.id))];
    if (ids.length === 0) return new Map();
    const rows = await db.select().from(media).where(inArray(media.id, ids));
    return new Map(rows.map((row) => [row.id, row]));
  }

  async function toEdit(key: SectionKey, content: unknown): Promise<SectionEdit> {
    const rows = await findMedia(collectMediaRefs(registry[key].schema, content));
    const mediaById: Record<number, MediaItem> = {};
    for (const [id, row] of rows) mediaById[id] = toMediaItem(row);
    return { content: content as SectionEdit['content'], media: mediaById };
  }

  // Cada mídia citada precisa existir e ser do tipo do campo (imagem × vídeo)
  async function assertMediaRefs(refs: MediaRef[]): Promise<void> {
    const rows = await findMedia(refs);
    const issues: z.core.$ZodIssue[] = [];
    for (const { path, kind, id } of refs) {
      const row = rows.get(id);
      if (!row || row.kind !== kind) {
        issues.push({
          code: 'custom',
          path: path.split('.'),
          input: id,
          message: mediaError(kind, Boolean(row)),
        });
      }
    }
    if (issues.length > 0) throw new z.ZodError(issues);
  }

  return {
    // GET /site: todas as seções com as mídias resolvidas (mídia sumida vira null)
    async getSite(): Promise<SiteContent> {
      const all = await readAll();
      const rows = await findMedia(
        [...all].flatMap(([key, content]) => collectMediaRefs(registry[key].schema, content)),
      );

      const site: Record<string, unknown> = {};
      for (const [key, content] of all) {
        site[key] = mapMedia(registry[key].schema, content, ({ kind, id }) => {
          const row = rows.get(id);
          return row && row.kind === kind ? toAsset(row) : null;
        });
      }
      return site as SiteContent;
    },

    async getEdit(key: SectionKey): Promise<SectionEdit> {
      return toEdit(key, (await readAll()).get(key));
    },

    async put(key: SectionKey, body: unknown): Promise<SectionEdit> {
      const schema = registry[key].schema;
      const content = schema.parse(body);
      await assertMediaRefs(collectMediaRefs(schema, content));

      await db
        .insert(siteSections)
        .values({ key, content })
        .onDuplicateKeyUpdate({ set: { content } });
      await revalidator.revalidate([sectionTag(key)]);
      return toEdit(key, content);
    },

    async findMediaUsage(id: number): Promise<MediaUsage[]> {
      const usage: MediaUsage[] = [];
      for (const [key, content] of await readAll()) {
        if (collectMediaRefs(registry[key].schema, content).some((ref) => ref.id === id)) {
          usage.push({ type: 'section', key, label: registry[key].label });
        }
      }
      return usage;
    },
  };
}

export type SectionsService = ReturnType<typeof createSectionsService>;
