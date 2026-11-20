import {
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  type MediaItem,
  type MediaKind,
  type MediaList,
} from '@webforge/shared';
import { api } from '../../lib/api.ts';

export const ACCEPTED_FILES = 'image/jpeg,image/png,image/webp,video/mp4';

export const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Confere o tamanho antes de enviar, para não subir um arquivo que a API vai recusar
export function checkFileSize(file: File): string | null {
  const isVideo = file.type === 'video/mp4';
  const limit = isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  if (file.size <= limit) return null;
  return `${isVideo ? 'O vídeo' : 'A imagem'} excede o limite de ${formatSize(limit)}.`;
}

export interface ListParams {
  page?: number;
  kind?: MediaKind | undefined;
}

export function listMedia({ page = 1, kind }: ListParams = {}, signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(page) });
  if (kind) query.set('kind', kind);
  return api<MediaList>(`/media?${query.toString()}`, signal ? { signal } : {});
}

export function uploadMedia(file: File, alt: string) {
  const form = new FormData();
  form.append('alt', alt);
  form.append('file', file);
  return api<MediaItem>('/media', { method: 'POST', form });
}

export const updateMediaAlt = (id: number, alt: string) =>
  api<MediaItem>(`/media/${id}`, { method: 'PATCH', json: { alt } });

export const deleteMedia = (id: number) => api<void>(`/media/${id}`, { method: 'DELETE' });
