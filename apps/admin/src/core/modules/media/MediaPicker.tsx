import type { MediaItem, MediaKind, MediaList } from '@webforge/shared';
import { XIcon } from 'lucide-react';
import { useCallback, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFetcher } from 'react-router';
import { Button, Spinner } from '../../ui/index.ts';
import { MediaThumb } from './MediaThumb.tsx';
import { UploadForm } from './UploadForm.tsx';
import { useMediaLibrary } from './media-context.ts';

const accepts: Record<MediaKind, string> = {
  image: 'image/jpeg,image/png,image/webp',
  video: 'video/mp4',
};

export const mediaNoun = (kind: MediaKind) => (kind === 'image' ? 'imagem' : 'vídeo');

interface MediaPickerOptions {
  kind: MediaKind;
  onChoose: (item: MediaItem) => void;
  selectedId?: number | null;
}

// Diálogo para escolher ou enviar uma mídia da biblioteca.
// Devolve `open()` e o elemento do diálogo, que deve ser renderizado pelo componente.
export function useMediaPicker({ kind, onChoose, selectedId = null }: MediaPickerOptions): {
  open: () => void;
  dialog: ReactNode;
} {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const library = useFetcher<{ list: MediaList }>();
  const { addMedia } = useMediaLibrary();
  const noun = mediaNoun(kind);

  const open = () => {
    dialogRef.current?.showModal();
    void library.load(`/media?kind=${kind}`);
  };

  const choose = useCallback(
    (item: MediaItem) => {
      if (item.kind !== kind) return;
      addMedia(item);
      onChoose(item);
      dialogRef.current?.close();
    },
    [addMedia, onChoose, kind],
  );

  // No body: o diálogo tem um formulário de envio e não pode ficar dentro de outro form.
  // No React, eventos atravessam o portal: sem o stopPropagation, enviar um arquivo aqui
  // dispararia também o onSubmit do formulário da seção ou do post.
  const dialog = createPortal(
    <dialog
      ref={dialogRef}
      onSubmit={(event) => event.stopPropagation()}
      aria-labelledby={`${id}-title`}
      className="bg-background text-foreground m-auto w-full max-w-3xl rounded-lg border p-0 shadow-lg backdrop:bg-black/50"
    >
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            Escolher {noun}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fechar"
            onClick={() => dialogRef.current?.close()}
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>

        {library.state === 'loading' && !library.data && <Spinner label="Carregando…" />}
        {library.data &&
          (library.data.list.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum {noun} na biblioteca. Envie abaixo.
            </p>
          ) : (
            <ul className="grid max-h-80 grid-cols-3 gap-3 overflow-y-auto p-1 sm:grid-cols-4">
              {library.data.list.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => choose(item)}
                    aria-pressed={item.id === selectedId}
                    className={`focus-visible:ring-ring/50 block w-full rounded-md p-1 text-left ring-2 outline-none focus-visible:ring-[3px] ${item.id === selectedId ? 'ring-primary' : 'hover:ring-border ring-transparent'}`}
                  >
                    <MediaThumb item={item} />
                    <span className="text-muted-foreground mt-1 block truncate text-xs">
                      {item.alt}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ))}
        {library.data && library.data.list.total > library.data.list.items.length && (
          <p className="text-muted-foreground text-xs">
            Mostrando os {library.data.list.items.length} mais recentes. Os demais estão na página
            Mídia.
          </p>
        )}

        <div className="border-t pt-5">
          <h3 className="mb-4 text-sm font-semibold">Enviar {noun} novo</h3>
          <UploadForm accept={accepts[kind]} onUploaded={choose} />
        </div>
      </div>
    </dialog>,
    document.body,
  );

  return { open, dialog };
}
