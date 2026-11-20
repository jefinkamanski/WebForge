import { LinkListField } from '../../core/modules/sections/LinkListField.tsx';
import type { SectionFormProps } from '../../core/modules/sections/section-form.ts';
import { TextAreaField } from '../../core/ui/index.ts';

export function FooterForm({ value, onChange, errors }: SectionFormProps<'footer'>) {
  return (
    <>
      <TextAreaField
        label="Texto"
        value={value.text}
        maxLength={400}
        onChange={(event) => onChange({ text: event.target.value })}
        error={errors['text']}
      />
      <LinkListField
        label="Links"
        name="links"
        value={value.links}
        onChange={(links) => onChange({ links })}
        errors={errors}
      />
    </>
  );
}
