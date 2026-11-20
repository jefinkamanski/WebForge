import type { PublicPostList } from '@webforge/shared';
import Link from 'next/link';
import { siteConfig } from '@/site/site.config';
import { PostCard } from './PostCard';

export const blogPageHref = (page: number) => (page <= 1 ? '/blog' : `/blog/pagina/${page}`);

// Lista do blog: /blog e /blog/pagina/N
export function BlogIndex({ list }: { list: PublicPostList }) {
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-16">
      <header className="max-w-2xl space-y-3">
        <h1 className="text-ink text-4xl font-bold">
          {siteConfig.blog.title}
          {list.page > 1 && <span className="sr-only"> – página {list.page}</span>}
        </h1>
        <p className="text-ink-muted text-lg">{siteConfig.blog.description}</p>
      </header>

      {list.items.length === 0 ? (
        <p className="text-ink-muted">Nenhum post publicado ainda.</p>
      ) : (
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {list.items.map((post) => (
            <li key={post.slug} className="relative flex">
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Páginas do blog" className="flex items-center justify-between gap-4">
          {list.page > 1 ? (
            <Link
              href={blogPageHref(list.page - 1)}
              rel="prev"
              className="text-brand-700 font-medium"
            >
              ← Posts mais novos
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-muted text-sm">
            Página {list.page} de {pages}
          </span>
          {list.page < pages ? (
            <Link
              href={blogPageHref(list.page + 1)}
              rel="next"
              className="text-brand-700 font-medium"
            >
              Posts mais antigos →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
