import type { MediaListResponse, MediaResponse, MediaUsage } from '@site/shared';
import { api } from '../../lib/api.ts';

export interface MediaLimits {
  imageBytes: number;
  videoBytes: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  kind?: 'image' | 'video' | undefined;
}

export function listMedia({ page = 1, pageSize = 24, kind }: ListParams = {}) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (kind) query.set('kind', kind);
  return api<MediaListResponse>(`/media?${query}`);
}

export const getMedia = (id: number) => api<MediaResponse>(`/media/${id}`);
export const getMediaLimits = () => api<MediaLimits>('/media/limits');

export const uploadMedia = (formData: FormData) =>
  api<MediaResponse>('/media', { method: 'POST', formData });

export const updateMediaAlt = (id: number, alt: string) =>
  api<MediaResponse>(`/media/${id}`, { method: 'PATCH', json: { alt } });

export const deleteMedia = (id: number) => api<void>(`/media/${id}`, { method: 'DELETE' });

export interface InUseDetails {
  usage: MediaUsage[];
}
