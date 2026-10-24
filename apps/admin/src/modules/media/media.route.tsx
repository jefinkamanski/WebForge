import { mediaAltSchema } from '@site/shared';
import { Alert, Button, ConfirmDialog, Modal, Spinner, TextField } from '@site/ui';
import { useState } from 'react';
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
  useSubmit,
  type LoaderFunctionArgs,
} from 'react-router';
import type { MediaResponse } from '@site/shared';
import { ApiError } from '../../lib/api.ts';
import {
  deleteMedia,
  getMediaLimits,
  listMedia,
  updateMediaAlt,
  uploadMedia,
  type InUseDetails,
} from './media.api.ts';
import { MediaThumb, formatBytes } from './MediaThumb.tsx';

interface ActionResult {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  inUse?: InUseDetails['usage'];
  intent?: string;
  mediaId?: number;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const params = new URL(request.url).searchParams;
  const kind = params.get('kind');
  const [list, limits] = await Promise.all([
    listMedia({
      page: Math.max(1, Number(params.get('page')) || 1),
      kind: kind === 'image' || kind === 'video' ? kind : undefined,
    }),
    getMediaLimits(),
  ]);
  return { list, limits };
}

export async function action({ request }: { request: Request }): Promise<ActionResult> {
  const form = await request.formData();
  const intent = String(form.get('intent'));

  try {
    if (intent === 'upload') {
      const file = form.get('file');
      const alt = mediaAltSchema.safeParse(form.get('alt'));
      if (!(file instanceof File) || file.size === 0) {
        return { intent, errors: { file: 'Escolha um arquivo.' } };
      }
      if (!alt.success) {
        return { intent, errors: { alt: alt.error.issues[0]?.message ?? 'Texto inválido.' } };
      }
      await uploadMedia(form);
      return { intent, ok: true, message: 'Arquivo enviado.' };
    }

    const id = Number(form.get('id'));
    if (intent === 'update-alt') {
      const alt = mediaAltSchema.safeParse(form.get('alt'));
      if (!alt.success) {
        return {
          intent,
          mediaId: id,
          errors: { alt: alt.error.issues[0]?.message ?? 'Inválido.' },
        };
      }
      await updateMediaAlt(id, alt.data);
      return { intent, ok: true, message: 'Texto alternativo atualizado.' };
    }
    if (intent === 'delete') {
      await deleteMedia(id);
      return { intent, ok: true, message: 'Mídia excluída.' };
    }
    return { intent, message: 'Ação desconhecida.' };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const usage = (error.details as InUseDetails | undefined)?.usage;
    return {
      intent,
      mediaId: Number(form.get('id')) || undefined,
      message: error.message,
      inUse: usage,
    };
  }
}

export function Component() {
  const { list, limits } = useLoaderData<typeof loader>();
  const result = useActionData<ActionResult>();
  const navigation = useNavigation();
  const [params] = useSearchParams();
  const [editing, setEditing] = useState<MediaResponse | null>(null);
  const [deleting, setDeleting] = useState<MediaResponse | null>(null);
  // Resultado vigente quando o diálogo abriu: só um resultado NOVO de sucesso fecha o diálogo
  const [baseline, setBaseline] = useState<ActionResult | undefined>(undefined);
  // Limpa o formulário de envio a cada upload concluído (ajuste de estado durante o render)
  const [handled, setHandled] = useState(result);
  const [uploadFormVersion, setUploadFormVersion] = useState(0);
  if (result !== handled) {
    setHandled(result);
    if (result?.ok && result.intent === 'upload') setUploadFormVersion((version) => version + 1);
  }
  const submit = useSubmit();

  const kind = params.get('kind') ?? '';
  const busy = navigation.state === 'submitting';
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const pageLink = (page: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(page));
    return `?${next}`;
  };

  const finished = result !== undefined && result !== baseline && result.ok === true && !busy;
  const editingOpen = editing !== null && !(finished && result.intent === 'update-alt');
  const deletingOpen = deleting !== null && !(finished && result.intent === 'delete');
  const deleteBlocked =
    result?.intent === 'delete' && result.inUse && deleting?.id === result.mediaId;

  const openEdit = (item: MediaResponse) => {
    setBaseline(result);
    setEditing(item);
  };
  const openDelete = (item: MediaResponse) => {
    setBaseline(result);
    setDeleting(item);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Biblioteca de mídia</h1>

      {result?.ok && result.message && <Alert tone="success">{result.message}</Alert>}
      {result && !result.ok && !result.errors && !result.inUse && result.message && (
        <Alert tone="error">{result.message}</Alert>
      )}

      <section
        aria-labelledby="upload-title"
        className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <h2 id="upload-title" className="mb-4 text-lg font-semibold text-slate-900">
          Enviar arquivo
        </h2>
        <Form
          method="post"
          encType="multipart/form-data"
          className="grid gap-4 md:grid-cols-2"
          key={uploadFormVersion}
        >
          <input type="hidden" name="intent" value="upload" />
          <div className="space-y-1">
            <label htmlFor="file" className="block text-sm font-medium text-slate-800">
              Arquivo
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              aria-describedby="file-hint"
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
            />
            <p id="file-hint" className="text-xs text-slate-600">
              Imagens JPG, PNG ou WebP (até {formatBytes(limits.imageBytes)}), convertidas para
              WebP. Vídeos MP4 ou WebM já otimizados (até {formatBytes(limits.videoBytes)}); o
              servidor não comprime vídeo. Veja o guia de compressão em <code>docs/MIDIA.md</code>.
            </p>
            {result?.intent === 'upload' && result.errors?.['file'] && (
              <p className="text-xs font-medium text-red-700">{result.errors['file']}</p>
            )}
          </div>
          <TextField
            label="Texto alternativo (obrigatório)"
            name="alt"
            hint="Descreva a imagem ou o vídeo. Usado por leitores de tela e SEO."
            maxLength={255}
            error={result?.intent === 'upload' ? result.errors?.['alt'] : undefined}
          />
          {result?.intent === 'upload' && result.message && !result.ok && (
            <div className="md:col-span-2">
              <Alert tone="error">{result.message}</Alert>
            </div>
          )}
          <div className="md:col-span-2">
            <Button type="submit" loading={busy && navigation.formData?.get('intent') === 'upload'}>
              Enviar
            </Button>
          </div>
        </Form>
      </section>

      <section aria-labelledby="library-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="library-title" className="text-lg font-semibold text-slate-900">
            Arquivos ({list.total})
          </h2>
          <Form method="get" className="flex items-end gap-2">
            <div className="space-y-1">
              <label htmlFor="kind" className="block text-sm font-medium text-slate-800">
                Tipo
              </label>
              <select
                id="kind"
                name="kind"
                defaultValue={kind}
                className="rounded-md border-0 py-2 pl-3 pr-8 text-sm ring-1 ring-inset ring-slate-300"
              >
                <option value="">Todos</option>
                <option value="image">Imagens</option>
                <option value="video">Vídeos</option>
              </select>
            </div>
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
          </Form>
        </div>

        {navigation.state === 'loading' && <Spinner label="Carregando…" />}

        {list.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
            Nenhum arquivo encontrado. Envie o primeiro acima.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {list.items.map((item) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200"
              >
                <MediaThumb media={item} className="aspect-video w-full" />
                <div className="space-y-2 p-3">
                  <p className="line-clamp-2 text-sm text-slate-800">{item.alt}</p>
                  <p className="text-xs text-slate-600">
                    {item.kind === 'video' ? 'Vídeo' : 'Imagem'} · {formatBytes(item.size)}
                    {item.width && item.height ? ` · ${item.width}×${item.height}` : ''}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => openEdit(item)}
                    >
                      Editar texto
                    </Button>
                    <Button
                      variant="danger"
                      className="px-2 py-1 text-xs"
                      onClick={() => openDelete(item)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav aria-label="Paginação" className="flex items-center justify-between text-sm">
            {list.page > 1 ? (
              <Link to={pageLink(list.page - 1)} className="font-medium text-indigo-700">
                Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-slate-600">
              Página {list.page} de {pages}
            </span>
            {list.page < pages ? (
              <Link to={pageLink(list.page + 1)} className="font-medium text-indigo-700">
                Próxima
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>

      <Modal open={editingOpen} title="Editar texto alternativo" onClose={() => setEditing(null)}>
        <Form method="post" className="space-y-4" key={editing?.id}>
          <input type="hidden" name="intent" value="update-alt" />
          <input type="hidden" name="id" value={editing?.id ?? ''} />
          <TextField
            label="Texto alternativo"
            name="alt"
            defaultValue={editing?.alt ?? ''}
            maxLength={255}
            error={result?.intent === 'update-alt' ? result.errors?.['alt'] : undefined}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={busy}>
              Salvar
            </Button>
          </div>
        </Form>
      </Modal>

      <ConfirmDialog
        open={deletingOpen}
        title="Excluir mídia"
        loading={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const form = new FormData();
          form.set('intent', 'delete');
          form.set('id', String(deleting?.id));
          submit(form, { method: 'post' });
        }}
      >
        <p>Esta ação remove o arquivo e todas as suas versões e não pode ser desfeita.</p>
        {deleteBlocked && (
          <div className="mt-3">
            <Alert tone="error">
              <p className="font-medium">{result.message}</p>
              <ul className="mt-1 list-disc pl-5">
                {result.inUse?.map((usage) => (
                  <li key={`${usage.type}-${usage.id}`}>{usage.label}</li>
                ))}
              </ul>
            </Alert>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
