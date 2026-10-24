import { z } from 'zod';

const mediaId = z.number().int().positive().nullable();

// Só caminhos internos e esquemas seguros: bloqueia javascript: e similares
const href = z
  .string()
  .trim()
  .max(500)
  .refine((value) => /^(\/|#|https?:\/\/|mailto:|tel:)/i.test(value), {
    message: 'Use um caminho (/pagina), âncora (#id) ou link http(s), mailto: ou tel:',
  });
const link = z.object({
  label: z.string().trim().min(1).max(60),
  href: href.min(1),
});

export const headerSectionSchema = z.object({
  siteName: z.string().trim().min(1).max(120),
  logoMediaId: mediaId,
  navItems: z.array(link).max(10),
});

export const heroSectionSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    subtitle: z.string().trim().max(400),
    videoMp4MediaId: mediaId,
    videoWebmMediaId: mediaId,
    posterMediaId: mediaId,
    ctaLabel: z.string().trim().max(60),
    ctaHref: href.or(z.literal('')),
  })
  .refine(
    (value) =>
      (value.videoMp4MediaId === null && value.videoWebmMediaId === null) ||
      value.posterMediaId !== null,
    { path: ['posterMediaId'], message: 'O poster é obrigatório quando há vídeo' },
  );

export const footerSectionSchema = z.object({
  text: z.string().trim().max(400),
  links: z.array(link).max(10),
});

export const seoSectionSchema = z.object({
  siteName: z.string().trim().min(1).max(120),
  defaultTitle: z.string().trim().min(1).max(70),
  defaultDescription: z.string().trim().max(160),
  shareImageMediaId: mediaId,
});

// Criar uma seção nova = registrar o schema aqui (sem migration)
export const sectionRegistry = {
  header: headerSectionSchema,
  hero: heroSectionSchema,
  footer: footerSectionSchema,
  seo: seoSectionSchema,
} as const;

export type SectionKey = keyof typeof sectionRegistry;
export type SectionContent<K extends SectionKey> = z.infer<(typeof sectionRegistry)[K]>;

export const sectionKeys = Object.keys(sectionRegistry) as SectionKey[];

export function isSectionKey(value: string): value is SectionKey {
  return Object.hasOwn(sectionRegistry, value);
}

export interface MediaRef {
  field: string;
  id: number;
}

// Campos "*MediaId" de uma seção: usados para validar e para saber onde cada mídia está em uso
export function collectMediaRefs(content: unknown): MediaRef[] {
  if (typeof content !== 'object' || content === null) return [];

  const refs: MediaRef[] = [];
  for (const [key, value] of Object.entries(content)) {
    if (key.endsWith('MediaId') && typeof value === 'number') {
      refs.push({ field: key, id: value });
    } else if (typeof value === 'object') {
      refs.push(...collectMediaRefs(value));
    }
  }
  return refs;
}

export const sectionMediaKinds: Record<string, 'image' | 'video'> = {
  logoMediaId: 'image',
  posterMediaId: 'image',
  shareImageMediaId: 'image',
  videoMp4MediaId: 'video',
  videoWebmMediaId: 'video',
};

export const defaultSectionContent: { [K in SectionKey]: SectionContent<K> } = {
  header: { siteName: 'Meu Site', logoMediaId: null, navItems: [] },
  hero: {
    title: 'Bem-vindo',
    subtitle: '',
    videoMp4MediaId: null,
    videoWebmMediaId: null,
    posterMediaId: null,
    ctaLabel: '',
    ctaHref: '',
  },
  footer: { text: '', links: [] },
  seo: {
    siteName: 'Meu Site',
    defaultTitle: 'Meu Site',
    defaultDescription: '',
    shareImageMediaId: null,
  },
};
