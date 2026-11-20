import type { PublicPostSummary } from '@webforge/shared';
import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/core/format';
import { mediaUrl } from '@/core/site';

// Cartão de um post na lista do blog
export function PostCard({ post }: { post: PublicPostSummary }) {
  return (
    <article className="group border-line bg-surface flex w-full flex-col overflow-hidden rounded-xl border">
      {post.cover && (
        <Image
          src={mediaUrl(post.cover.url)}
          alt=""
          width={post.cover.width}
          height={post.cover.height}
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
          className="aspect-video w-full object-cover"
        />
      )}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <time dateTime={post.publishedAt} className="text-ink-muted text-sm">
          {formatDate(post.publishedAt)}
        </time>
        <h2 className="text-ink text-xl font-semibold text-balance">
          {/* O link cobre o cartão todo, mas o texto do link é só o título */}
          <Link
            href={`/blog/${post.slug}`}
            className="group-hover:text-brand-700 after:absolute after:inset-0"
          >
            {post.title}
          </Link>
        </h2>
        {post.excerpt && <p className="text-ink-muted">{post.excerpt}</p>}
      </div>
    </article>
  );
}
