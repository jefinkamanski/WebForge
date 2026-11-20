import type { SiteContent } from '@webforge/shared';
import Image from 'next/image';
import { mediaUrl } from '@/core/site';
import { SmartLink } from '@/core/SmartLink';

// Destaque da home. O poster é a imagem principal da página (LCP): carrega primeiro e
// fica por baixo do vídeo. Quem prefere menos movimento vê só o poster.
export function Hero({ content }: { content: SiteContent['hero'] }) {
  const { title, subtitle, video, poster, ctaLabel, ctaHref } = content;
  const hasMedia = Boolean(video ?? poster);

  return (
    <section className="bg-brand-900 relative isolate overflow-hidden text-white">
      {poster && (
        <Image
          src={mediaUrl(poster.url)}
          // Com vídeo, o poster é decorativo; sem vídeo, ele é o conteúdo
          alt={video ? '' : poster.alt}
          fill
          sizes="100vw"
          preload
          className="-z-20 object-cover"
        />
      )}
      {video && (
        <video
          className="absolute inset-0 -z-20 size-full object-cover motion-reduce:hidden"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          // Sem "poster" aqui: o vídeo fica transparente até o 1º quadro e deixa ver a
          // imagem otimizada por baixo (evita baixar o poster duas vezes)
        >
          <source src={mediaUrl(video.url)} type={video.mime} />
        </video>
      )}
      {/* Escurece a mídia para o texto manter o contraste */}
      {hasMedia && <div className="bg-ink/55 absolute inset-0 -z-10" aria-hidden="true" />}

      <div className="mx-auto flex min-h-[70svh] max-w-6xl flex-col justify-center gap-6 px-6 py-24">
        <h1 className="max-w-3xl text-4xl font-bold text-balance sm:text-6xl">{title}</h1>
        {subtitle && (
          <p className="max-w-2xl text-lg text-pretty text-white/90 sm:text-xl">{subtitle}</p>
        )}
        {ctaLabel && ctaHref && (
          <SmartLink
            href={ctaHref}
            className="bg-brand-600 hover:bg-brand-700 w-fit rounded-md px-6 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {ctaLabel}
          </SmartLink>
        )}
      </div>
    </section>
  );
}
