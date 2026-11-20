import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLd, pageOpenGraph, postJsonLd } from '@/core/seo';
import { getPost, getPostSlugs, getSite, mediaUrl } from '@/core/site';
import { PostArticle } from '@/site/blog/PostArticle';

interface Props {
  params: Promise<{ slug: string }>;
}

// Posts que já existem saem prontos no build; os novos são gerados no primeiro acesso
export async function generateStaticParams() {
  return (await getPostSlugs()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [post, site] = await Promise.all([getPost((await params).slug), getSite()]);
  if (!post) return {};

  const description = post.seoDescription || post.excerpt;
  return {
    title: post.seoTitle || post.title,
    ...(description && { description }),
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: pageOpenGraph(site, {
      type: 'article',
      title: post.seoTitle || post.title,
      ...(description && { description }),
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      ...(post.cover && {
        images: [
          {
            url: mediaUrl(post.cover.url),
            width: post.cover.width,
            height: post.cover.height,
            alt: post.cover.alt,
          },
        ],
      }),
    }),
  };
}

export default async function PostPage({ params }: Props) {
  const [post, site] = await Promise.all([getPost((await params).slug), getSite()]);
  if (!post) notFound();

  return (
    <>
      <JsonLd data={postJsonLd(post, site)} />
      <PostArticle post={post} />
    </>
  );
}
