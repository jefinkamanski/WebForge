import { ImageField } from '../../core/modules/sections/MediaField.tsx';
import { LinkListField } from '../../core/modules/sections/LinkListField.tsx';
import type { SectionFormProps } from '../../core/modules/sections/section-form.ts';

export function HeaderForm({ value, onChange, errors }: SectionFormProps<'header'>) {
  return (
    <>
      <ImageField
        label="Logo"
        hint="De preferência PNG ou WebP com fundo transparente."
        value={value.logo}
        onChange={(logo) => onChange({ logo })}
        error={errors['logo']}
      />
      <LinkListField
        label="Itens do menu"
        name="navItems"
        max={8}
        value={value.navItems}
        onChange={(navItems) => onChange({ navItems })}
        errors={errors}
      />
    </>
  );
}
