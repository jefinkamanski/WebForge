import type { Metadata } from 'next';
import { pageOpenGraph } from '@/core/seo';
import { getPosts, getSite } from '@/core/site';
import { BlogIndex } from '@/site/blog/BlogIndex';
import { siteConfig } from '@/site/site.config';

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = siteConfig.blog;
  return {
    title,
    description,
    alternates: { canonical: '/blog' },
    openGraph: pageOpenGraph(await getSite(), { title, description, url: '/blog' }),
  };
}

// Primeira página do blog (as demais ficam em /blog/pagina/N)
export default async function BlogPage() {
  return <BlogIndex list={await getPosts(1)} />;
}
