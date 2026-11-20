import type { PostEdit, PostInput, PostList, PostStatus } from '@webforge/shared';
import { api } from '../../lib/api.ts';

export interface PostListParams {
  page: number;
  view: 'active' | 'trash';
  status?: PostStatus | undefined;
}

export function listPosts({ page, view, status }: PostListParams, signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(page), view });
  if (status) query.set('status', status);
  return api<PostList>(`/posts?${query.toString()}`, signal ? { signal } : {});
}

export const getPost = (id: number) => api<PostEdit>(`/posts/${id}`);

export const createPost = (input: PostInput) =>
  api<PostEdit>('/posts', { method: 'POST', json: input });

export const updatePost = (id: number, input: PostInput) =>
  api<PostEdit>(`/posts/${id}`, { method: 'PUT', json: input });

export const trashPost = (id: number) => api<void>(`/posts/${id}`, { method: 'DELETE' });

export const restorePost = (id: number) =>
  api<PostEdit>(`/posts/${id}/restore`, { method: 'POST' });

export const destroyPost = (id: number) =>
  api<void>(`/posts/${id}/permanent`, { method: 'DELETE' });

// URL pública do post, quando o painel sabe onde fica o site (VITE_SITE_URL)
export function postPublicUrl(slug: string): string | null {
  const site = import.meta.env.VITE_SITE_URL?.replace(/\/$/, '');
  return site ? `${site}/blog/${slug}` : null;
}

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );
