import {
  collectMediaRefs,
  footerSectionSchema,
  headerSectionSchema,
  heroSectionSchema,
  isSectionKey,
  seoSectionSchema,
  sectionRegistry,
  type MediaResponse,
} from '@site/shared';
import { useLoaderData } from 'react-router';
import { ApiError } from '../../lib/api.ts';
import { issuesToFieldErrors } from '../../lib/forms.ts';
import { getMedia } from '../media/media.api.ts';
import { FooterForm, HeaderForm, HeroForm, SeoForm } from './section-forms.tsx';
import { getSection, putSection } from './settings.api.ts';
import type { SaveResult } from './SectionCard.tsx';

export async function loader() {
  const [header, hero, footer, seo] = await Promise.all([
    getSection('header').then((data) => headerSectionSchema.parse(data)),
    getSection('hero').then((data) => heroSectionSchema.parse(data)),
    getSection('footer').then((data) => footerSectionSchema.parse(data)),
    getSection('seo').then((data) => seoSectionSchema.parse(data)),
  ]);

  // Mídias já escolhidas, para exibir as miniaturas nos seletores
  const ids = new Set(
    [header, hero, footer, seo].flatMap((section) =>
      collectMediaRefs(section).map((ref) => ref.id),
    ),
  );
  const found = await Promise.all(
    [...ids].map((id) =>
      getMedia(id).catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }),
    ),
  );
  const media: Record<number, MediaResponse> = {};
  for (const item of found) if (item) media[item.id] = item;

  return { header, hero, footer, seo, media };
}

export async function action({ request }: { request: Request }): Promise<SaveResult> {
  const { key, content } = (await request.json()) as { key: string; content: unknown };
  if (!isSectionKey(key)) return { key, message: 'Seção desconhecida.' };

  const parsed = sectionRegistry[key].safeParse(content);
  if (!parsed.success) return { key, errors: issuesToFieldErrors(parsed.error) };

  try {
    await putSection(key, parsed.data);
    return { key, ok: true };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const errors = Object.fromEntries(
      Object.entries(error.fields).flatMap(([field, messages]) =>
        messages[0] ? [[field, messages[0]]] : [],
      ),
    );
    return { key, message: error.message, errors };
  }
}

export function Component() {
  const { header, hero, footer, seo, media } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Configurações do site</h1>
      <HeaderForm initial={header} media={media} />
      <HeroForm initial={hero} media={media} />
      <FooterForm initial={footer} media={media} />
      <SeoForm initial={seo} media={media} />
    </div>
  );
}
