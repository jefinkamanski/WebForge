import {
  footerSectionSchema,
  headerSectionSchema,
  heroSectionSchema,
  seoSectionSchema,
  type MediaResponse,
} from '@site/shared';
import { TextAreaField, TextField } from '@site/ui';
import { useState } from 'react';
import type { z } from 'zod';
import { LinkListField } from './LinkListField.tsx';
import { MediaPicker } from './MediaPicker.tsx';
import { SectionCard, useSectionSave } from './SectionCard.tsx';

type MediaById = Record<number, MediaResponse>;

interface FormProps<T> {
  initial: T;
  media: MediaById;
}

const pick = (media: MediaById, id: number | null) => (id === null ? null : (media[id] ?? null));

export function HeaderForm({ initial, media }: FormProps<z.infer<typeof headerSectionSchema>>) {
  const [siteName, setSiteName] = useState(initial.siteName);
  const [logo, setLogo] = useState(pick(media, initial.logoMediaId));
  const [navItems, setNavItems] = useState(initial.navItems);
  const { errors, message, saving, save } = useSectionSave('header', headerSectionSchema);

  return (
    <SectionCard
      title="Cabeçalho"
      description="Logo e menu de navegação exibidos no topo do site."
      saving={saving}
      result={message}
      onSave={() => save({ siteName, logoMediaId: logo?.id ?? null, navItems })}
    >
      <TextField
        label="Nome do site"
        value={siteName}
        maxLength={120}
        onChange={(event) => setSiteName(event.target.value)}
        error={errors['siteName']}
      />
      <MediaPicker
        label="Logo"
        kind="image"
        value={logo}
        onChange={setLogo}
        error={errors['logoMediaId']}
      />
      <LinkListField
        legend="Menu"
        items={navItems}
        onChange={setNavItems}
        errors={errors}
        max={10}
        path="navItems"
      />
    </SectionCard>
  );
}

export function HeroForm({ initial, media }: FormProps<z.infer<typeof heroSectionSchema>>) {
  const [title, setTitle] = useState(initial.title);
  const [subtitle, setSubtitle] = useState(initial.subtitle);
  const [mp4, setMp4] = useState(pick(media, initial.videoMp4MediaId));
  const [webm, setWebm] = useState(pick(media, initial.videoWebmMediaId));
  const [poster, setPoster] = useState(pick(media, initial.posterMediaId));
  const [ctaLabel, setCtaLabel] = useState(initial.ctaLabel);
  const [ctaHref, setCtaHref] = useState(initial.ctaHref);
  const { errors, message, saving, save } = useSectionSave('hero', heroSectionSchema);

  return (
    <SectionCard
      title="Destaque da home"
      description="Vídeo, título e botão da área principal. Envie o vídeo em MP4 e, se possível, também em WebM."
      saving={saving}
      result={message}
      onSave={() =>
        save({
          title,
          subtitle,
          videoMp4MediaId: mp4?.id ?? null,
          videoWebmMediaId: webm?.id ?? null,
          posterMediaId: poster?.id ?? null,
          ctaLabel,
          ctaHref,
        })
      }
    >
      <TextField
        label="Título"
        value={title}
        maxLength={160}
        onChange={(event) => setTitle(event.target.value)}
        error={errors['title']}
      />
      <TextAreaField
        label="Subtítulo"
        value={subtitle}
        maxLength={400}
        onChange={(event) => setSubtitle(event.target.value)}
        error={errors['subtitle']}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <MediaPicker
          label="Vídeo MP4 (H.264)"
          kind="video"
          value={mp4}
          onChange={setMp4}
          error={errors['videoMp4MediaId']}
        />
        <MediaPicker
          label="Vídeo WebM (opcional)"
          kind="video"
          value={webm}
          onChange={setWebm}
          error={errors['videoWebmMediaId']}
        />
      </div>
      <MediaPicker
        label="Poster (imagem exibida enquanto o vídeo carrega)"
        kind="image"
        value={poster}
        onChange={setPoster}
        error={errors['posterMediaId']}
        hint="Obrigatório quando há vídeo."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label="Texto do botão"
          value={ctaLabel}
          maxLength={60}
          onChange={(event) => setCtaLabel(event.target.value)}
          error={errors['ctaLabel']}
        />
        <TextField
          label="Endereço do botão"
          value={ctaHref}
          maxLength={500}
          placeholder="/contato ou https://..."
          onChange={(event) => setCtaHref(event.target.value)}
          error={errors['ctaHref']}
        />
      </div>
    </SectionCard>
  );
}

export function FooterForm({ initial }: FormProps<z.infer<typeof footerSectionSchema>>) {
  const [text, setText] = useState(initial.text);
  const [links, setLinks] = useState(initial.links);
  const { errors, message, saving, save } = useSectionSave('footer', footerSectionSchema);

  return (
    <SectionCard
      title="Rodapé"
      description="Texto e links exibidos no final de todas as páginas."
      saving={saving}
      result={message}
      onSave={() => save({ text, links })}
    >
      <TextAreaField
        label="Texto"
        value={text}
        maxLength={400}
        onChange={(event) => setText(event.target.value)}
        error={errors['text']}
      />
      <LinkListField
        legend="Links"
        items={links}
        onChange={setLinks}
        errors={errors}
        max={10}
        path="links"
      />
    </SectionCard>
  );
}

export function SeoForm({ initial, media }: FormProps<z.infer<typeof seoSectionSchema>>) {
  const [siteName, setSiteName] = useState(initial.siteName);
  const [defaultTitle, setDefaultTitle] = useState(initial.defaultTitle);
  const [defaultDescription, setDefaultDescription] = useState(initial.defaultDescription);
  const [shareImage, setShareImage] = useState(pick(media, initial.shareImageMediaId));
  const { errors, message, saving, save } = useSectionSave('seo', seoSectionSchema);

  return (
    <SectionCard
      title="SEO global"
      description="Valores padrão para buscadores e compartilhamento em redes sociais."
      saving={saving}
      result={message}
      onSave={() =>
        save({
          siteName,
          defaultTitle,
          defaultDescription,
          shareImageMediaId: shareImage?.id ?? null,
        })
      }
    >
      <TextField
        label="Nome do site"
        value={siteName}
        maxLength={120}
        onChange={(event) => setSiteName(event.target.value)}
        error={errors['siteName']}
      />
      <TextField
        label="Título padrão"
        value={defaultTitle}
        maxLength={70}
        hint="Até 70 caracteres."
        onChange={(event) => setDefaultTitle(event.target.value)}
        error={errors['defaultTitle']}
      />
      <TextAreaField
        label="Descrição padrão"
        value={defaultDescription}
        maxLength={160}
        hint="Até 160 caracteres."
        onChange={(event) => setDefaultDescription(event.target.value)}
        error={errors['defaultDescription']}
      />
      <MediaPicker
        label="Imagem de compartilhamento"
        kind="image"
        value={shareImage}
        onChange={setShareImage}
        error={errors['shareImageMediaId']}
      />
    </SectionCard>
  );
}
