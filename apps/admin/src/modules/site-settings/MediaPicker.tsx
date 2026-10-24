import type { MediaListResponse, MediaResponse } from '@site/shared';
import { Alert, Button, Modal, Spinner } from '@site/ui';
import { useState } from 'react';
import { useFetcher } from 'react-router';
import { MediaThumb } from '../media/MediaThumb.tsx';

interface MediaLoaderData {
  list: MediaListResponse;
}

export interface MediaPickerProps {
  label: string;
  kind: 'image' | 'video';
  value: MediaResponse | null;
  onChange: (media: MediaResponse | null) => void;
  error?: string | undefined;
  hint?: string;
}

// Escolhe uma mídia já enviada. A lista só é buscada quando o seletor é aberto.
export function MediaPicker({ label, kind, value, onChange, error, hint }: MediaPickerProps) {
  const fetcher = useFetcher<MediaLoaderData>();
  const [open, setOpen] = useState(false);

  const load = (page: number) => void fetcher.load(`/media?kind=${kind}&page=${page}`);
  const list = fetcher.data?.list;
  const pages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-800">{label}</p>
      <div className="flex items-center gap-4">
        {value ? (
          <MediaThumb media={value} interactive={false} className="h-20 w-32 rounded-md" />
        ) : (
          <span className="flex h-20 w-32 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-600">
            Nenhum
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(true);
              load(1);
            }}
          >
            {value ? 'Trocar' : 'Escolher'}
          </Button>
          {value && (
            <Button variant="secondary" onClick={() => onChange(null)}>
              Remover
            </Button>
          )}
        </div>
      </div>
      {hint && <p className="text-xs text-slate-600">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-700">{error}</p>}

      <Modal
        open={open}
        wide
        title={kind === 'image' ? 'Escolher imagem' : 'Escolher vídeo'}
        onClose={() => setOpen(false)}
      >
        {fetcher.state === 'loading' && !list && <Spinner label="Carregando…" />}
        {list && list.items.length === 0 && (
          <Alert>
            Nenhum arquivo deste tipo na biblioteca. Envie um em <strong>Mídia</strong> e volte
            aqui.
          </Alert>
        )}
        {list && list.items.length > 0 && (
          <ul className="grid max-h-[60vh] gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
            {list.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  className="w-full overflow-hidden rounded-md text-left ring-1 ring-slate-200 hover:ring-2 hover:ring-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-600"
                >
                  <MediaThumb media={item} interactive={false} className="aspect-video w-full" />
                  <span className="line-clamp-2 block p-2 text-xs text-slate-800">{item.alt}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={!list || list.page <= 1}
              onClick={() => load((list?.page ?? 2) - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={!list || list.page >= pages}
              onClick={() => load((list?.page ?? 0) + 1)}
            >
              Próxima
            </Button>
          </div>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
