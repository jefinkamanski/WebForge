import type { PublicPost } from '@webforge/shared';
import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/core/format';
import { RichText } from '@/core/RichText';
import { mediaUrl } from '@/core/site';
import { siteConfig } from '@/site/site.config';

// Página de um post: trilha, título, data, capa e texto
export function PostArticle({ post }: { post: PublicPost }) {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-6 py-12">
      <nav aria-label="Trilha" className="text-ink-muted text-sm">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href="/" className="hover:text-brand-700">
              Início
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/blog" className="hover:text-brand-700">
              {siteConfig.blog.title}
            </Link>
          </li>
        </ol>
      </nav>

      <header className="space-y-4">
        <h1 className="text-ink text-4xl font-bold text-balance sm:text-5xl">{post.title}</h1>
        <time dateTime={post.publishedAt} className="text-ink-muted block">
          {formatDate(post.publishedAt)}
        </time>
      </header>

      {post.cover && (
        <Image
          src={mediaUrl(post.cover.url)}
          alt={post.cover.alt}
          width={post.cover.width}
          height={post.cover.height}
          sizes="(min-width: 768px) 720px, 100vw"
          preload
          className="h-auto w-full rounded-xl"
        />
      )}

      <RichText doc={post.content} />

      <footer className="border-line border-t pt-6">
        <Link href="/blog" className="text-brand-700 font-medium">
          ← Ver todos os posts
        </Link>
      </footer>
    </article>
  );
}
