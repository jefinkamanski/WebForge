import type { Metadata } from 'next';
import { pageOpenGraph } from '@/core/seo';
import { getSite } from '@/core/site';
import { ContactPage } from '@/site/forms/ContactPage';

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Contato';
  const description = 'Fale com a gente pelo formulário de contato.';
  return {
    title,
    description,
    alternates: { canonical: '/contato' },
    openGraph: pageOpenGraph(await getSite(), { title, description, url: '/contato' }),
  };
}

export default function Page() {
  return <ContactPage />;
}
