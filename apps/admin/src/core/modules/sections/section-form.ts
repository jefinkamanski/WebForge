import type { SectionContent, SectionKey } from '@webforge/shared';
import type { ComponentType } from 'react';

// Props recebidas pelo formulário de cada seção (apps/admin/src/site/sections/)
export interface SectionFormProps<K extends SectionKey> {
  value: SectionContent<K>;
  // Atualiza só os campos informados
  onChange: (patch: Partial<SectionContent<K>>) => void;
  // Erro por caminho do campo: "title", "navItems.0.href"…
  errors: Record<string, string>;
}

// Registro do painel: toda seção do site precisa de um formulário
export type SectionForms = { [K in SectionKey]: ComponentType<SectionFormProps<K>> };
