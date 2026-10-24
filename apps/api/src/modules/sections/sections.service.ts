import {
  collectMediaRefs,
  defaultSectionContent,
  sectionMediaKinds,
  sectionRegistry,
  type SectionKey,
} from '@site/shared';
import { eq, inArray } from 'drizzle-orm';
import { ZodError } from 'zod';
import type { Db } from '../../db/client.js';
import { media, siteSections } from '../../db/schema.js';
import type { Revalidator } from '../revalidation/revalidator.js';

export const sectionTag = (key: SectionKey) => `section:${key}`;

export function createSectionsService(db: Db, revalidator: Revalidator) {
  // Confere que cada *MediaId existe e é do tipo certo (imagem x vídeo)
  async function assertMediaRefs(content: unknown): Promise<void> {
    const refs = collectMediaRefs(content);
    if (refs.length === 0) return;

    const rows = await db
      .select({ id: media.id, kind: media.kind })
      .from(media)
      .where(inArray(media.id, [...new Set(refs.map((ref) => ref.id))]));
    const kindById = new Map(rows.map((row) => [row.id, row.kind]));

    const fields: Record<string, string[]> = {};
    for (const { field, id } of refs) {
      const kind = kindById.get(id);
      const expected = sectionMediaKinds[field];
      if (!kind) {
        fields[field] = ['Mídia não encontrada.'];
      } else if (expected && kind !== expected) {
        fields[field] = [expected === 'image' ? 'Selecione uma imagem.' : 'Selecione um vídeo.'];
      }
    }
    if (Object.keys(fields).length > 0) {
      throw new ZodError(
        Object.entries(fields).map(([field, messages]) => ({
          code: 'custom' as const,
          path: [field],
          message: messages[0] ?? 'Valor inválido.',
        })),
      );
    }
  }

  return {
    // Conteúdo salvo fora do schema atual (ex.: formato antigo) volta ao padrão em vez de quebrar
    async get(key: SectionKey) {
      const [row] = await db.select().from(siteSections).where(eq(siteSections.key, key)).limit(1);
      if (!row) return defaultSectionContent[key];

      const raw: unknown = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
      const parsed = sectionRegistry[key].safeParse(raw);
      return parsed.success ? parsed.data : defaultSectionContent[key];
    },

    async put(key: SectionKey, body: unknown) {
      const content = sectionRegistry[key].parse(body);
      await assertMediaRefs(content);

      await db
        .insert(siteSections)
        .values({ key, content })
        .onDuplicateKeyUpdate({ set: { content } });

      await revalidator.revalidate([sectionTag(key)]);
      return content;
    },
  };
}

export type SectionsService = ReturnType<typeof createSectionsService>;
