import type { SectionKey, SiteContent } from '@webforge/shared';
import type { ComponentType } from 'react';

// Componente do site para uma seção: recebe o conteúdo com as mídias já resolvidas
export type SectionComponent<K extends SectionKey> = ComponentType<{ content: SiteContent[K] }>;

// Registro do site (site/sections/index.ts): só as seções que viram bloco na página
export type SectionComponents = { [K in SectionKey]?: SectionComponent<K> };
