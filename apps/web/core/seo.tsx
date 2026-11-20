import type { PublicPost, SiteContent } from '@webforge/shared';
import type { Metadata } from 'next';
import { siteConfig } from '@/site/site.config';
import { env } from './env';
import { mediaUrl } from './site';

// "pt-BR" -> "pt_BR" (formato do Open Graph)
const ogLocale = (locale: string) => locale.replace('-', '_');

// Metadata padrão de todas as páginas, a partir da seção SEO global
export function siteMetadata({ seo }: SiteContent): Metadata {
  const image = seo.shareImage;
  return {
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    title: { default: seo.defaultTitle, template: `%s | ${seo.siteName}` },
    ...(seo.defaultDescription && { description: seo.defaultDescription }),
    applicationName: seo.siteName,
    openGraph: {
      type: 'website',
      siteName: seo.siteName,
      locale: ogLocale(siteConfig.locale),
      ...(image && {
        images: [
          { url: mediaUrl(image.url), width: image.width, height: image.height, alt: image.alt },
        ],
      }),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary' },
  };
}

// Organization + WebSite (schema.org) para buscadores e LLMs
export function siteJsonLd({ seo, header }: SiteContent) {
  const url = `${env.NEXT_PUBLIC_SITE_URL}/`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${url}#organization`,
        name: seo.siteName,
        url,
        ...(header.logo && { logo: mediaUrl(header.logo.url) }),
      },
      {
        '@type': 'WebSite',
        '@id': `${url}#website`,
        name: seo.siteName,
        url,
        inLanguage: siteConfig.locale,
        ...(seo.defaultDescription && { description: seo.defaultDescription }),
        publisher: { '@id': `${url}#organization` },
      },
    ],
  };
}

// JSON seguro dentro de <script>: "<" escapado impede fechar a tag (XSS)
export const serializeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

// BlogPosting + BreadcrumbList de um post
export function postJsonLd(post: PublicPost, { seo }: SiteContent) {
  const site = env.NEXT_PUBLIC_SITE_URL;
  const url = `${site}/blog/${post.slug}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#post`,
        headline: post.title,
        description: post.seoDescription || post.excerpt,
        url,
        mainEntityOfPage: url,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        inLanguage: siteConfig.locale,
        ...(post.cover && { image: mediaUrl(post.cover.url) }),
        author: { '@id': `${site}/#organization` },
        publisher: { '@id': `${site}/#organization` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: seo.siteName, item: `${site}/` },
          { '@type': 'ListItem', position: 2, name: siteConfig.blog.title, item: `${site}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      },
    ],
  };
}

type OpenGraph = NonNullable<Metadata['openGraph']>;

// O openGraph de uma página substitui o do layout por inteiro: este repete o que é do
// site (nome, idioma, imagem padrão) e aplica o que é da página por cima
export function pageOpenGraph({ seo }: SiteContent, page: OpenGraph): OpenGraph {
  const image = seo.shareImage;
  return {
    siteName: seo.siteName,
    locale: ogLocale(siteConfig.locale),
    ...(image && {
      images: [
        { url: mediaUrl(image.url), width: image.width, height: image.height, alt: image.alt },
      ],
    }),
    ...page,
  } as OpenGraph;
}
