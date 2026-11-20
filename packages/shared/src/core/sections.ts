import { z } from 'zod';
import type { sections } from '../site/index.js';
import type { ImageAsset, MediaItem, MediaKind, VideoAsset } from './media.js';

// ===== Campos de mídia =====

// Ids de mídia "marcados": o TypeScript não deixa trocar imagem por vídeo,
// e o site recebe cada um já resolvido (ImageAsset/VideoAsset)
export type ImageId = number & z.$brand<'ImageId'>;
export type VideoId = number & z.$brand<'VideoId'>;

const mediaKinds = new WeakMap<z.ZodType, MediaKind>();

const mediaId = () => z.number().int().positive();

function markMedia<T extends z.ZodType>(schema: T, kind: MediaKind): T {
  mediaKinds.set(schema, kind);
  return schema;
}

// Imagem da biblioteca de mídia (id), vazia por padrão
export const imageField = () =>
  markMedia(mediaId().brand<'ImageId'>(), 'image').nullable().default(null);
// Vídeo MP4 da biblioteca de mídia (id), vazio por padrão
export const videoField = () =>
  markMedia(mediaId().brand<'VideoId'>(), 'video').nullable().default(null);

export interface MediaRef {
  // Caminho do campo no conteúdo, ex.: "logo" ou "items.0.photo"
  path: string;
  kind: MediaKind;
  id: number;
}

function unwrap(schema: z.ZodType): z.ZodType {
  let current = schema;
  while (
    current instanceof z.ZodDefault ||
    current instanceof z.ZodNullable ||
    current instanceof z.ZodOptional
  ) {
    current = current.unwrap() as z.ZodType;
  }
  return current;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Percorre schema e conteúdo juntos e troca cada id de mídia pelo retorno de `visit`
export function mapMedia(
  schema: z.ZodType,
  value: unknown,
  visit: (ref: MediaRef) => unknown,
  path: string[] = [],
): unknown {
  const current = unwrap(schema);
  const kind = mediaKinds.get(current);
  if (kind) {
    return typeof value === 'number' ? visit({ path: path.join('.'), kind, id: value }) : value;
  }
  if (current instanceof z.ZodArray && Array.isArray(value)) {
    const element = current.element as z.ZodType;
    return value.map((item, index) => mapMedia(element, item, visit, [...path, String(index)]));
  }
  if (current instanceof z.ZodObject && isRecord(value)) {
    const result: Record<string, unknown> = { ...value };
    for (const [key, field] of Object.entries(current.shape as Record<string, z.ZodType>)) {
      if (key in value) result[key] = mapMedia(field, value[key], visit, [...path, key]);
    }
    return result;
  }
  return value;
}

export function collectMediaRefs(schema: z.ZodType, value: unknown): MediaRef[] {
  const refs: MediaRef[] = [];
  mapMedia(schema, value, (ref) => {
    refs.push(ref);
    return ref.id;
  });
  return refs;
}

// Tipo do conteúdo com as mídias resolvidas, como o site recebe em GET /site
export type Resolved<T> = T extends ImageId
  ? ImageAsset
  : T extends VideoId
    ? VideoAsset
    : T extends readonly (infer U)[]
      ? Resolved<U>[]
      : T extends object
        ? { [K in keyof T]: Resolved<T[K]> }
        : T;

// ===== Links =====

// Só caminhos internos e esquemas seguros: bloqueia javascript: e similares
const SAFE_HREF = /^(\/|#|https?:\/\/|mailto:|tel:)/i;
export const HREF_MESSAGE =
  'Use um caminho (/pagina), âncora (#id) ou link http(s), mailto: ou tel:';
// Também usado nos links do texto dos posts
export const isSafeHref = (value: string) => SAFE_HREF.test(value);
const href = z.string().trim().max(500);

// Link opcional (vazio por padrão)
export const hrefField = () =>
  href.refine((value) => value === '' || SAFE_HREF.test(value), HREF_MESSAGE).default('');

export const linkSchema = z.object({
  label: z.string().trim().min(1).max(60),
  href: href.min(1).refine((value) => SAFE_HREF.test(value), HREF_MESSAGE),
});
export type Link = z.infer<typeof linkSchema>;

// Lista de links (menu, rodapé…), vazia por padrão
export const linkListField = (max = 10) => z.array(linkSchema).max(max).default([]);

// ===== Definição de seções =====

// Grupo do menu lateral do painel: blocos visíveis do site ou configurações gerais
export const SECTION_GROUPS = ['content', 'settings'] as const;
export type SectionGroup = (typeof SECTION_GROUPS)[number];

export interface SectionDefinition<K extends string = string, S extends z.ZodType = z.ZodType> {
  key: K;
  // Nome exibido no painel
  label: string;
  group: SectionGroup;
  schema: S;
  // Conteúdo usado enquanto o cliente não salvar a seção (sai dos .default() do schema)
  defaults: z.output<S>;
}

const SECTION_KEY = /^[a-z][a-zA-Z0-9]*$/;

// Define uma seção. Falha já na importação se algum campo não tiver .default().
export function defineSection<const K extends string, S extends z.ZodObject>({
  key,
  label,
  group = 'content',
  schema,
}: {
  key: K;
  label: string;
  // "settings" coloca a seção em "Configurações" no painel (padrão: "Seções do site")
  group?: SectionGroup;
  schema: S;
}): SectionDefinition<K, S> {
  if (!SECTION_KEY.test(key)) {
    throw new Error(`Seção "${key}": use uma chave em camelCase, sem espaços ou símbolos.`);
  }
  const parsed = schema.safeParse({});
  if (!parsed.success) {
    throw new Error(
      `Seção "${key}": todo campo precisa de .default().\n${z.prettifyError(parsed.error)}`,
    );
  }
  return { key, label, group, schema, defaults: parsed.data };
}

// Monta o registro { chave: seção } e recusa chaves repetidas
export function registerSections<const T extends readonly SectionDefinition[]>(
  ...definitions: T
): { [D in T[number] as D['key']]: D } {
  const registry: Record<string, SectionDefinition> = {};
  for (const definition of definitions) {
    if (Object.hasOwn(registry, definition.key)) {
      throw new Error(`Seção "${definition.key}" registrada duas vezes.`);
    }
    registry[definition.key] = definition;
  }
  return registry as { [D in T[number] as D['key']]: D };
}

// ===== Tipos derivados do registro do site =====

export type Sections = typeof sections;
export type SectionKey = keyof Sections & string;
export type SectionContent<K extends SectionKey> = z.output<Sections[K]['schema']>;

// GET /site: todas as seções com as mídias resolvidas
export type SiteContent = { [K in SectionKey]: Resolved<SectionContent<K>> };

// GET/PUT /sections/:key: conteúdo bruto (com ids) e as mídias citadas, para o painel
export interface SectionEdit<K extends SectionKey = SectionKey> {
  content: SectionContent<K>;
  media: Record<number, MediaItem>;
}
