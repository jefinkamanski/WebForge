import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { pageOpenGraph } from '@/core/seo';
import { getPosts, getSite } from '@/core/site';
import { BlogIndex, blogPageHref } from '@/site/blog/BlogIndex';
import { siteConfig } from '@/site/site.config';

interface Props {
  params: Promise<{ page: string }>;
}

// Só números inteiros a partir de 1 ("2", não "02" nem "2.5")
function parsePage(value: string): number {
  const page = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(page)) notFound();
  return page;
}

// Geradas no primeiro acesso e guardadas em cache, como os posts
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = parsePage((await params).page);
  const title = `${siteConfig.blog.title} – página ${page}`;
  const { description } = siteConfig.blog;
  return {
    title,
    description,
    alternates: { canonical: blogPageHref(page) },
    openGraph: pageOpenGraph(await getSite(), { title, description, url: blogPageHref(page) }),
  };
}

export default async function BlogPaginatedPage({ params }: Props) {
  const page = parsePage((await params).page);
  // /blog/pagina/1 é o mesmo que /blog
  if (page === 1) permanentRedirect('/blog');

  const list = await getPosts(page);
  if (list.items.length === 0) notFound();
  return <BlogIndex list={list} />;
}
