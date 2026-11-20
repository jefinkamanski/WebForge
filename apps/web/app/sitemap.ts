import type { MetadataRoute } from 'next';
import { env } from '@/core/env';
import { getPostSlugs } from '@/core/site';

// Páginas públicas do site; os posts entram com a data da última edição
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = env.NEXT_PUBLIC_SITE_URL;
  const posts = await getPostSlugs();
  return [
    { url: `${site}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/blog`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${site}/contato`, changeFrequency: 'yearly', priority: 0.5 },
    ...posts.map((post) => ({
      url: `${site}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
