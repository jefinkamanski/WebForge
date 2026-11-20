import type { SectionKey, SiteContent } from '@webforge/shared';
import type { Metadata } from 'next';
import type { ComponentType } from 'react';
import { JsonLd, siteJsonLd } from '@/core/seo';
import { getSite } from '@/core/site';
import { sectionComponents } from '@/site/sections';
import { siteConfig } from '@/site/site.config';

export const metadata: Metadata = { alternates: { canonical: '/' } };

type AnySectionComponent = ComponentType<{ content: SiteContent[SectionKey] }>;

// Home: os blocos de siteConfig.homeSections, na ordem configurada
export default async function HomePage() {
  const site = await getSite();

  return (
    <>
      <JsonLd data={siteJsonLd(site)} />
      {siteConfig.homeSections.map((key) => {
        const Section = sectionComponents[key] as AnySectionComponent | undefined;
        if (!Section) {
          console.warn(`Seção "${key}" está em homeSections, mas não tem componente no site.`);
          return null;
        }
        return <Section key={key} content={site[key]} />;
      })}
    </>
  );
}
