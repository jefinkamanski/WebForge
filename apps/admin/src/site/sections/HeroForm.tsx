import { ImageField, VideoField } from '../../core/modules/sections/MediaField.tsx';
import type { SectionFormProps } from '../../core/modules/sections/section-form.ts';
import { TextAreaField, TextField } from '../../core/ui/index.ts';

export function HeroForm({ value, onChange, errors }: SectionFormProps<'hero'>) {
  return (
    <>
      <TextField
        label="Título"
        value={value.title}
        maxLength={120}
        onChange={(event) => onChange({ title: event.target.value })}
        error={errors['title']}
      />
      <TextAreaField
        label="Subtítulo"
        value={value.subtitle}
        maxLength={300}
        onChange={(event) => onChange({ subtitle: event.target.value })}
        error={errors['subtitle']}
      />
      <VideoField
        label="Vídeo de fundo"
        hint="MP4 curto (5 a 15 s), sem áudio. Veja o guia de mídia."
        value={value.video}
        onChange={(video) => onChange({ video })}
        error={errors['video']}
      />
      <ImageField
        label="Poster do vídeo"
        hint="Imagem do primeiro quadro: aparece enquanto o vídeo carrega."
        value={value.poster}
        onChange={(poster) => onChange({ poster })}
        error={errors['poster']}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Texto do botão"
          value={value.ctaLabel}
          maxLength={40}
          onChange={(event) => onChange({ ctaLabel: event.target.value })}
          error={errors['ctaLabel']}
        />
        <TextField
          label="Link do botão"
          value={value.ctaHref}
          placeholder="/contato"
          onChange={(event) => onChange({ ctaHref: event.target.value })}
          error={errors['ctaHref']}
        />
      </div>
    </>
  );
}
