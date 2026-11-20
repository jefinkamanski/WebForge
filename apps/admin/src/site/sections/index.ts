// CLIENTE (editado no fork): formulário do painel para cada seção do site.
// O TypeScript acusa se uma seção registrada em packages/shared ficar sem formulário.
import type { SectionForms } from '../../core/modules/sections/section-form.ts';
import { FooterForm } from './FooterForm.tsx';
import { HeaderForm } from './HeaderForm.tsx';
import { HeroForm } from './HeroForm.tsx';
import { SeoForm } from './SeoForm.tsx';

export const sectionForms: SectionForms = {
  header: HeaderForm,
  hero: HeroForm,
  footer: FooterForm,
  seo: SeoForm,
};
