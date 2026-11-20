import { z } from 'zod';

export const MEDIA_KINDS = ['image', 'video'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

// Limites de upload (docs/MIDIA.md)
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 25 * 1024 * 1024;
// Largura máxima da WebP gerada; o next/image cria os tamanhos menores
export const IMAGE_MAX_WIDTH = 1920;

export const mediaAltSchema = z
  .string()
  .trim()
  .min(1, 'Descreva o conteúdo da mídia (texto alternativo)')
  .max(255);

export const updateMediaSchema = z.object({ alt: mediaAltSchema });
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;

export const listMediaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
  kind: z.enum(MEDIA_KINDS).optional(),
});
export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;

// Mídia como a API devolve ao painel. `url` é relativa à API (/uploads/...).
export interface MediaItem {
  id: number;
  kind: MediaKind;
  url: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string;
  createdAt: string;
}

export interface MediaList {
  items: MediaItem[];
  page: number;
  pageSize: number;
  total: number;
}

// Onde uma mídia está em uso (devolvido no 409 ao tentar excluí-la)
export interface MediaUsage {
  type: 'section' | 'post';
  // Chave da seção ou id do post
  key: string;
  label: string;
}

// Mídia já resolvida para o site, no lugar do id
export interface ImageAsset {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface VideoAsset {
  url: string;
  mime: string;
  alt: string;
}
