import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES, type MediaItem } from '@webforge/shared';
import { UploadIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useFetcher } from 'react-router';
import { Alert, Button, TextField } from '../../ui/index.ts';
import { ACCEPTED_FILES, formatSize } from './media.api.ts';
import type { MediaActionResult } from './media.route.tsx';

const imageHint = `JPG, PNG ou WebP até ${formatSize(IMAGE_MAX_BYTES)}`;
const videoHint = `MP4 (H.264) até ${formatSize(VIDEO_MAX_BYTES)}`;

// Mostra só os limites do tipo que o campo aceita
function fileHint(accept: string): string {
  if (!accept.includes('video')) return `${imageHint}.`;
  if (!accept.includes('image')) return `${videoHint}.`;
  return `Imagens ${imageHint}; vídeo ${videoHint}.`;
}

export interface UploadFormProps {
  // Chamado com a mídia criada (o seletor já a escolhe)
  onUploaded: (item: MediaItem) => void;
  accept?: string;
}

// Envio de imagem ou vídeo para a biblioteca, dentro do seletor de mídia das seções
export function UploadForm({ onUploaded, accept = ACCEPTED_FILES }: UploadFormProps) {
  const fetcher = useFetcher<MediaActionResult>();
  const formRef = useRef<HTMLFormElement>(null);
  const result = fetcher.data?.intent === 'upload' ? fetcher.data : undefined;
  const uploaded = result?.item;
  const handledId = useRef<number | null>(null);

  // Reage uma única vez a cada envio concluído
  useEffect(() => {
    if (!uploaded || handledId.current === uploaded.id) return;
    handledId.current = uploaded.id;
    formRef.current?.reset();
    onUploaded(uploaded);
  }, [uploaded, onUploaded]);

  return (
    <fetcher.Form
      ref={formRef}
      method="post"
      action="/media"
      encType="multipart/form-data"
      className="space-y-5"
      noValidate
    >
      <input type="hidden" name="intent" value="upload" />
      {result?.message && <Alert tone="error">{result.message}</Alert>}
      <TextField
        label="Arquivo"
        name="file"
        type="file"
        accept={accept}
        required
        hint={fileHint(accept)}
        error={result?.errors?.['file']}
        className="file:text-primary h-auto py-2 file:mr-3"
      />
      <TextField
        label="Texto alternativo"
        name="alt"
        required
        maxLength={255}
        hint="Descreva o que aparece, para quem usa leitor de tela e para o Google."
        error={result?.errors?.['alt']}
      />
      <Button type="submit" loading={fetcher.state !== 'idle'}>
        <UploadIcon aria-hidden="true" />
        Enviar
      </Button>
    </fetcher.Form>
  );
}
