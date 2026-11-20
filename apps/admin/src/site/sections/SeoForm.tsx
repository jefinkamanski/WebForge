import { ImageField } from '../../core/modules/sections/MediaField.tsx';
import type { SectionFormProps } from '../../core/modules/sections/section-form.ts';
import { TextAreaField, TextField } from '../../core/ui/index.ts';

export function SeoForm({ value, onChange, errors }: SectionFormProps<'seo'>) {
  return (
    <>
      <TextField
        label="Nome do site"
        value={value.siteName}
        maxLength={80}
        onChange={(event) => onChange({ siteName: event.target.value })}
        error={errors['siteName']}
      />
      <TextField
        label="Título padrão"
        hint="Usado nas páginas sem título próprio. O Google mostra cerca de 60 caracteres."
        value={value.defaultTitle}
        maxLength={70}
        onChange={(event) => onChange({ defaultTitle: event.target.value })}
        error={errors['defaultTitle']}
      />
      <TextAreaField
        label="Descrição padrão"
        hint="Até 160 caracteres."
        value={value.defaultDescription}
        maxLength={160}
        onChange={(event) => onChange({ defaultDescription: event.target.value })}
        error={errors['defaultDescription']}
      />
      <ImageField
        label="Imagem de compartilhamento"
        hint="Aparece ao compartilhar o site em redes sociais. Ideal: 1200×630 px."
        value={value.shareImage}
        onChange={(shareImage) => onChange({ shareImage })}
        error={errors['shareImage']}
      />
    </>
  );
}
