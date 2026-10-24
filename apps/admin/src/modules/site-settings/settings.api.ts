import { api } from '../../lib/api.ts';
import type { SectionKey } from '@site/shared';

export const getSection = (key: SectionKey) => api<unknown>(`/sections/${key}`);

export const putSection = (key: SectionKey, content: unknown) =>
  api<unknown>(`/sections/${key}`, { method: 'PUT', json: content });
