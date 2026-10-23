import { z } from 'zod';

const mediaId = z.number().int().positive().nullable();
const link = z.object({
  label: z.string().trim().min(1).max(60),
  href: z.string().trim().min(1).max(500),
});

export const headerSectionSchema = z.object({
  siteName: z.string().trim().min(1).max(120),
  logoMediaId: mediaId,
  navItems: z.array(link).max(10),
});

export const heroSectionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(400),
  videoMediaId: mediaId,
  posterMediaId: mediaId,
  ctaLabel: z.string().trim().max(60),
  ctaHref: z.string().trim().max(500),
});

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

export const defaultSectionContent: { [K in SectionKey]: SectionContent<K> } = {
  header: { siteName: 'Meu Site', logoMediaId: null, navItems: [] },
  hero: {
    title: 'Bem-vindo',
    subtitle: '',
    videoMediaId: null,
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
