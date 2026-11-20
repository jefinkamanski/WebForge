import {
  listMediaQuerySchema,
  mediaAltSchema,
  type MediaItem,
  type MediaUsage,
} from '@webforge/shared';
import { CheckIcon, ImagesIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useFetcher, useLoaderData } from 'react-router';
import { ApiError } from '../../lib/api.ts';
import {
  Alert,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  Input,
  PageHeader,
  Pagination,
} from '../../ui/index.ts';
import { MediaThumb } from './MediaThumb.tsx';
import {
  checkFileSize,
  deleteMedia,
  formatSize,
  listMedia,
  updateMediaAlt,
  uploadMedia,
} from './media.api.ts';

export type MediaActionResult =
  | { intent: 'upload'; item?: MediaItem; message?: string; errors?: Record<string, string> }
  | { intent: 'alt'; id: number; item?: MediaItem; message?: string }
  | { intent: 'delete'; id: number; deleted?: boolean; message?: string };

// Galeria com todas as mídias. Também atende o seletor das seções, que filtra por tipo
// (fetcher.load('/media?kind=image')).
export async function loader({ request }: { request: Request }) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = listMediaQuerySchema.safeParse(params);
  const { page, kind } = query.success ? query.data : { page: 1, kind: undefined };
  return { list: await listMedia({ page, kind }, request.signal), kind };
}

function inUseMessage(error: ApiError): string {
  const usage = (error.details as { usage?: MediaUsage[] } | undefined)?.usage ?? [];
  if (usage.length === 0) return error.message;
  return `${error.message} Em uso em: ${usage.map((use) => use.label).join(', ')}.`;
}

export async function action({ request }: { request: Request }): Promise<MediaActionResult> {
  const form = await request.formData();
  const intent = form.get('intent');
  const id = Number(form.get('id'));

  try {
    if (intent === 'upload') {
      const file = form.get('file');
      if (!(file instanceof File) || file.size === 0) {
        return { intent, errors: { file: 'Escolha um arquivo.' } };
      }
      const sizeError = checkFileSize(file);
      if (sizeError) return { intent, errors: { file: sizeError } };
      const alt = mediaAltSchema.safeParse(form.get('alt'));
      if (!alt.success) return { intent, errors: { alt: alt.error.issues[0]?.message ?? '' } };
      return { intent, item: await uploadMedia(file, alt.data) };
    }

    if (intent === 'alt') {
      const alt = mediaAltSchema.safeParse(form.get('alt'));
      if (!alt.success) return { intent, id, message: alt.error.issues[0]?.message ?? '' };
      return { intent, id, item: await updateMediaAlt(id, alt.data) };
    }

    await deleteMedia(id);
    return { intent: 'delete', id, deleted: true };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const message = error.code === 'MEDIA_IN_USE' ? inUseMessage(error) : error.message;
    if (intent === 'upload') {
      return { intent, message, errors: { alt: error.fields['alt']?.[0] ?? '' } };
    }
    return { intent: intent === 'alt' ? 'alt' : 'delete', id, message };
  }
}

function MediaCard({ item }: { item: MediaItem }) {
  const fetcher = useFetcher<MediaActionResult>();
  const altRef = useRef<HTMLInputElement>(null);
  const busy = fetcher.state !== 'idle';
  const message = fetcher.data?.message;
  const saved = fetcher.data?.intent === 'alt' && fetcher.data.item && !busy;

  // Mantém o campo igual ao valor salvo (ex.: espaços removidos pela API)
  useEffect(() => {
    if (saved && altRef.current) altRef.current.value = item.alt;
  }, [saved, item.alt]);

  return (
    <li className="bg-card space-y-3 rounded-lg border p-3">
      <MediaThumb item={item} />
      <p className="text-muted-foreground text-xs">
        {item.kind === 'image' ? `${item.width}×${item.height} px · ` : 'MP4 · '}
        {formatSize(item.size)}
      </p>
      <fetcher.Form method="post" action="/media" className="flex gap-2">
        <input type="hidden" name="intent" value="alt" />
        <input type="hidden" name="id" value={item.id} />
        <label className="sr-only" htmlFor={`alt-${item.id}`}>
          Texto alternativo
        </label>
        <Input
          ref={altRef}
          id={`alt-${item.id}`}
          name="alt"
          defaultValue={item.alt}
          maxLength={255}
          placeholder="Texto alternativo"
          className="min-w-0 flex-1"
        />
        <Button
          type="submit"
          variant="secondary"
          size="icon"
          aria-label="Salvar texto alternativo"
          disabled={busy}
        >
          <CheckIcon aria-hidden="true" />
        </Button>
      </fetcher.Form>
      {message && <Alert tone="error">{message}</Alert>}
      {saved && <p className="text-success-foreground text-xs">Texto salvo.</p>}
      <ConfirmDialog
        title="Excluir esta mídia?"
        description="O arquivo é apagado de vez. Não é possível desfazer."
        confirmLabel="Excluir"
        onConfirm={() =>
          void fetcher.submit(
            { intent: 'delete', id: String(item.id) },
            { method: 'post', action: '/media' },
          )
        }
        trigger={
          <Button
            variant="outline"
            className="text-error-foreground hover:bg-error/12 hover:text-error-foreground w-full"
            disabled={busy}
          >
            <Trash2Icon aria-hidden="true" />
            Excluir
          </Button>
        }
      />
    </li>
  );
}

const pageLink = (page: number) => `/media?page=${page}`;

export function Component() {
  const { list } = useLoaderData<typeof loader>();
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mídia"
        crumbs={[{ label: 'Arquivos' }, { label: 'Mídia' }]}
        description="Todas as imagens e vídeos do site. Para enviar um arquivo novo, use o campo de mídia na seção onde ele vai aparecer."
      />

      {list.items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ImagesIcon className="text-muted-foreground size-10" aria-hidden="true" />
            <p className="text-base font-semibold">Nenhuma mídia enviada ainda</p>
            <p className="text-muted-foreground text-sm">
              Envie imagens e vídeos pelos campos de mídia das seções e dos posts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </ul>
      )}

      <Pagination page={list.page} pages={pages} hrefFor={pageLink} />
    </div>
  );
}
