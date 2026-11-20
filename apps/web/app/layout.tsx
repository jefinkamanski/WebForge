import type { ReactNode } from 'react';
import { siteMetadata } from '@/core/seo';
import { getSite } from '@/core/site';
import { Footer } from '@/site/sections/Footer';
import { Header } from '@/site/sections/Header';
import { siteConfig } from '@/site/site.config';
import './globals.css';

export async function generateMetadata() {
  return siteMetadata(await getSite());
}

// Moldura de todas as páginas: cabeçalho, conteúdo e rodapé editados no painel
export default async function RootLayout({ children }: { children: ReactNode }) {
  const site = await getSite();
  const siteName = site.seo.siteName;

  return (
    <html lang={siteConfig.locale}>
      <body className="bg-surface text-ink flex min-h-screen flex-col font-sans antialiased">
        <a
          href="#conteudo"
          className="bg-brand-600 sr-only rounded-md px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        >
          Pular para o conteúdo
        </a>
        <Header content={site.header} siteName={siteName} />
        <main id="conteudo" className="flex-1">
          {children}
        </main>
        <Footer content={site.footer} siteName={siteName} />
      </body>
    </html>
  );
}
