import type { ZodType } from 'zod';
import { Alert, Button } from '@site/ui';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { useFetcher } from 'react-router';
import { issuesToFieldErrors } from '../../lib/forms.ts';

export interface SaveResult {
  key: string;
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

// Valida no cliente com o schema da seção (mesmo da API) e envia como JSON para a action
export function useSectionSave(key: string, schema: ZodType) {
  const fetcher = useFetcher<SaveResult>();
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const serverErrors = fetcher.data?.key === key && fetcher.data.errors ? fetcher.data.errors : {};

  return {
    errors: { ...serverErrors, ...clientErrors },
    message: fetcher.data?.key === key ? fetcher.data : undefined,
    saving: fetcher.state !== 'idle',
    save(content: unknown) {
      const parsed = schema.safeParse(content);
      if (!parsed.success) {
        setClientErrors(issuesToFieldErrors(parsed.error));
        return;
      }
      setClientErrors({});
      // O conteúdo já foi validado pelo schema (JSON puro); o tipo do submit só aceita JsonValue
      void fetcher.submit({ key, content: parsed.data } as Parameters<typeof fetcher.submit>[0], {
        method: 'post',
        encType: 'application/json',
      });
    },
  };
}

export interface SectionCardProps {
  title: string;
  description: string;
  saving: boolean;
  result: SaveResult | undefined;
  onSave: () => void;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  saving,
  result,
  onSave,
  children,
}: SectionCardProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave();
  };

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mb-4 text-sm text-slate-600">{description}</p>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {children}
        {result?.ok && <Alert tone="success">Alterações salvas.</Alert>}
        {result && !result.ok && result.message && <Alert tone="error">{result.message}</Alert>}
        <Button type="submit" loading={saving}>
          Salvar alterações
        </Button>
      </form>
    </section>
  );
}
