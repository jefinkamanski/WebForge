// CLIENTE (editado no fork): componente do site para cada bloco da home.
// Cabeçalho e rodapé não entram aqui: o layout os mostra em todas as páginas.
import type { SectionComponents } from '@/core/sections';
import { Hero } from './Hero';

export const sectionComponents: SectionComponents = {
  hero: Hero,
};
