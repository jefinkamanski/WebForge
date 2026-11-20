import { z } from 'zod';
import { defineSection, hrefField, imageField, videoField } from '../../core/index.js';

export const hero = defineSection({
  key: 'hero',
  label: 'Destaque da home',
  schema: z
    .object({
      title: z.string().trim().min(1).max(120).default('Bem-vindo'),
      subtitle: z.string().trim().max(300).default(''),
      video: videoField(),
      // Aparece enquanto o vídeo carrega e para quem prefere menos movimento
      poster: imageField(),
      ctaLabel: z.string().trim().max(40).default(''),
      ctaHref: hrefField(),
    })
    .refine((value) => value.video === null || value.poster !== null, {
      path: ['poster'],
      message: 'Escolha um poster para o vídeo',
    })
    .refine((value) => (value.ctaLabel === '') === (value.ctaHref === ''), {
      path: ['ctaHref'],
      message: 'Preencha o texto e o link do botão, ou deixe os dois vazios',
    }),
});
