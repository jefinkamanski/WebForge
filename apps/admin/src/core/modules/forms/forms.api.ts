import type { FormSettings, FormSubmission, FormSummary, SubmissionList } from '@webforge/shared';
import { api } from '../../lib/api.ts';

export const listForms = (signal?: AbortSignal) =>
  api<FormSummary[]>('/forms', signal ? { signal } : {});

export function listSubmissions(
  key: string,
  { page, unread }: { page: number; unread: boolean },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({ page: String(page), ...(unread && { unread: 'true' }) });
  return api<SubmissionList>(
    `/forms/${key}/submissions?${query.toString()}`,
    signal ? { signal } : {},
  );
}

export const setSubmissionRead = (key: string, id: number, read: boolean) =>
  api<FormSubmission>(`/forms/${key}/submissions/${id}`, { method: 'PATCH', json: { read } });

export const deleteSubmission = (key: string, id: number) =>
  api<void>(`/forms/${key}/submissions/${id}`, { method: 'DELETE' });

export const updateFormSettings = (key: string, settings: FormSettings) =>
  api<FormSettings>(`/forms/${key}/settings`, { method: 'PUT', json: settings });

export const sendTestEmail = (key: string) =>
  api<{ to: string }>(`/forms/${key}/test-email`, { method: 'POST' });
