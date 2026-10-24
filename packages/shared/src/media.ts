import { z } from 'zod';

export const MEDIA_IMAGE_WIDTHS = [480, 768, 1280, 1920] as const;
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const;

export const mediaAltSchema = z
  .string()
  .trim()
  .min(1, 'O texto alternativo é obrigatório')
  .max(255);

export const updateMediaSchema = z.object({ alt: mediaAltSchema });
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;

export const listMediaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
  kind: z.enum(['image', 'video']).optional(),
});
export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;

export const mediaVariantSchema = z.object({
  width: z.number().int(),
  height: z.number().int(),
  url: z.string(),
});

export const mediaResponseSchema = z.object({
  id: z.number().int(),
  kind: z.enum(['image', 'video']),
  mime: z.string(),
  size: z.number().int(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  alt: z.string().nullable(),
  url: z.string(),
  variants: z.array(mediaVariantSchema),
  createdAt: z.string(),
});
export type MediaResponse = z.infer<typeof mediaResponseSchema>;

export const mediaUsageSchema = z.object({
  type: z.enum(['section', 'post']),
  id: z.string(),
  label: z.string(),
});
export type MediaUsage = z.infer<typeof mediaUsageSchema>;

export const mediaListResponseSchema = z.object({
  items: z.array(mediaResponseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type MediaListResponse = z.infer<typeof mediaListResponseSchema>;
