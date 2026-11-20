import type { ImageId, MediaKind, VideoId } from '@webforge/shared';
import { ImageIcon } from 'lucide-react';
import { useId } from 'react';
import { Button } from '../../ui/index.ts';
import { MediaThumb } from '../media/MediaThumb.tsx';
import { mediaNoun, useMediaPicker } from '../media/MediaPicker.tsx';
import { useMediaLibrary } from '../media/media-context.ts';

interface MediaFieldProps<Id extends number> {
  label: string;
  value: Id | null;
  onChange: (value: Id | null) => void;
  error?: string | undefined;
  hint?: string;
}

function MediaField<Id extends number>({
  kind,
  label,
  value,
  onChange,
  error,
  hint,
}: MediaFieldProps<Id> & { kind: MediaKind }) {
  const id = useId();
  const { media } = useMediaLibrary();
  const picker = useMediaPicker({
    kind,
    selectedId: value,
    onChoose: (item) => onChange(item.id as Id),
  });
  const current = value === null ? undefined : media[value];
  const noun = mediaNoun(kind);

  return (
    <div className="space-y-2" role="group" aria-labelledby={`${id}-label`}>
      <p id={`${id}-label`} className="text-sm font-medium">
        {label}
      </p>
      <div className="flex items-center gap-4">
        <div className="w-28 shrink-0">
          {current ? (
            <MediaThumb item={current} />
          ) : (
            <div className="bg-muted text-muted-foreground flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs">
              <ImageIcon className="size-5" aria-hidden="true" />
              {value === null ? `Sem ${noun}` : `${noun} #${value}`}
            </div>
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <Button variant="secondary" onClick={picker.open}>
            {value === null ? `Escolher ${noun}` : `Trocar ${noun}`}
          </Button>
          {value !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="text-error-foreground hover:bg-error/12 hover:text-error-foreground"
              onClick={() => onChange(null)}
            >
              Remover
            </Button>
          )}
        </div>
      </div>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      {error && <p className="text-error-foreground text-xs font-medium">{error}</p>}
      {picker.dialog}
    </div>
  );
}

// Campo para imageField(): escolhe ou envia uma imagem da biblioteca
export function ImageField(props: MediaFieldProps<ImageId>) {
  return <MediaField kind="image" {...props} />;
}

// Campo para videoField(): escolhe ou envia um vídeo MP4 da biblioteca
export function VideoField(props: MediaFieldProps<VideoId>) {
  return <MediaField kind="video" {...props} />;
}
