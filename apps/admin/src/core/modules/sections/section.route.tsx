import {
  sections,
  type SectionDefinition,
  type SectionEdit,
  type SectionKey,
} from '@webforge/shared';
import { useCallback, useState, type ComponentType } from 'react';
import { useFetcher, useLoaderData, type ShouldRevalidateFunctionArgs } from 'react-router';
import { sectionForms } from '../../../site/sections/index.ts';
import { ApiError, api } from '../../lib/api.ts';
import { issuesToFieldErrors } from '../../lib/forms.ts';
import { ExternalLinkIcon } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from '../../ui/index.ts';
import { MediaLibrary, useMediaLibraryState } from '../media/media-context.ts';
import type { SectionFormProps } from './section-form.ts';

const registry = sections as Record<SectionKey, SectionDefinition>;

interface SaveResult {
  edit?: SectionEdit;
  errors?: Record<string, string>;
  message?: string;
}

function parseKey(value: string | undefined): SectionKey {
  if (!value || !Object.hasOwn(registry, value)) {
    throw new Response('Seção não encontrada', { status: 404 });
  }
  return value as SectionKey;
}

export async function loader({ params }: { params: { key?: string } }) {
  const key = parseKey(params.key);
  return { key, edit: await api<SectionEdit>(`/sections/${key}`) };
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { key?: string };
}): Promise<SaveResult> {
  const key = parseKey(params.key);
  const content: unknown = await request.json();

  // Mesma validação da API, antes de enviar
  const parsed = registry[key].schema.safeParse(content);
  if (!parsed.success) {
    return { errors: issuesToFieldErrors(parsed.error), message: 'Corrija os campos destacados.' };
  }

  try {
    return { edit: await api<SectionEdit>(`/sections/${key}`, { method: 'PUT', json: content }) };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const errors: Record<string, string> = {};
    for (const [path, messages] of Object.entries(error.fields)) {
      if (messages[0]) errors[path] = messages[0];
    }
    return { errors, message: error.message };
  }
}

// Enviar ou editar mídia no seletor não recarrega a seção (o que está na tela seria perdido)
export function shouldRevalidate({
  formAction,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  return formAction?.startsWith('/media') ? false : defaultShouldRevalidate;
}

function SectionEditor({ sectionKey, edit }: { sectionKey: SectionKey; edit: SectionEdit }) {
  const fetcher = useFetcher<SaveResult>();
  const [value, setValue] = useState(edit.content);
  const mediaLibrary = useMediaLibraryState(edit.media);
  const [dirty, setDirty] = useState(false);

  // Ao salvar, adota o conteúdo devolvido pela API (já normalizado)
  const result = fetcher.state === 'idle' ? fetcher.data : undefined;
  const [handled, setHandled] = useState(result);
  if (result !== handled) {
    setHandled(result);
    if (result?.edit) {
      setValue(result.edit.content);
      mediaLibrary.setMedia(result.edit.media);
      setDirty(false);
    }
  }

  const onChange = useCallback((patch: object) => {
    setValue((current) => ({ ...current, ...patch }));
    setDirty(true);
  }, []);

  const SectionForm = sectionForms[sectionKey] as ComponentType<SectionFormProps<SectionKey>>;
  const errors = result?.errors ?? {};
  const saving = fetcher.state !== 'idle';

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void fetcher.submit(value, { method: 'put', encType: 'application/json' });
      }}
    >
      {result?.message && <Alert tone="error">{result.message}</Alert>}
      {errors[''] && <Alert tone="error">{errors['']}</Alert>}
      {result?.edit && !dirty && (
        <Alert tone="success">Seção salva. O site é atualizado em instantes.</Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent className="space-y-5">
            <MediaLibrary.Provider value={mediaLibrary.value}>
              <SectionForm value={value} onChange={onChange} errors={errors} />
            </MediaLibrary.Provider>
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-6 lg:col-span-4">
          <CardHeader>
            <CardTitle>Publicação</CardTitle>
            <CardDescription>{dirty ? 'Há alterações não salvas.' : 'Tudo salvo.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="submit" loading={saving} className="w-full">
              Salvar
            </Button>
            {siteUrl && (
              <Button asChild variant="outline" className="w-full">
                <a href={siteUrl} target="_blank" rel="noreferrer">
                  Ver no site
                  <ExternalLinkIcon aria-hidden="true" />
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

const siteUrl = import.meta.env.VITE_SITE_URL || null;

const groupTitles = { content: 'Seções do site', settings: 'Configurações' } as const;

export function Component() {
  const { key, edit } = useLoaderData<typeof loader>();
  const section = registry[key];

  return (
    <div className="space-y-6">
      <PageHeader
        title={section.label}
        crumbs={[{ label: groupTitles[section.group] }, { label: section.label }]}
      />
      {/* key: trocar de seção recomeça o formulário do zero */}
      <SectionEditor key={key} sectionKey={key} edit={edit} />
    </div>
  );
}
