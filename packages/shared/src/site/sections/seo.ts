import { z } from 'zod';
import { defineSection, imageField } from '../../core/index.js';

export const seo = defineSection({
  key: 'seo',
  label: 'SEO global',
  group: 'settings',
  schema: z.object({
    siteName: z.string().trim().min(1).max(80).default('Meu site'),
    // Título das páginas sem título próprio (Google mostra ~60 caracteres)
    defaultTitle: z.string().trim().min(1).max(70).default('Meu site'),
    defaultDescription: z.string().trim().max(160).default(''),
    // Imagem de compartilhamento (Open Graph), idealmente 1200×630
    shareImage: imageField(),
  }),
});
