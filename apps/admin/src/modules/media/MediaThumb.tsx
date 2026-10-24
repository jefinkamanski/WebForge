import type { MediaResponse } from '@site/shared';
import { assetUrl } from '../../lib/api.ts';

export const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export interface MediaThumbProps {
  media: MediaResponse;
  className?: string;
  // Desligue dentro de botões: os controles do <video> capturariam o clique
  interactive?: boolean;
}

// Miniatura: imagem usa a variante responsiva mais próxima de 480 px; vídeo carrega só os metadados
export function MediaThumb({ media, className = '', interactive = true }: MediaThumbProps) {
  if (media.kind === 'video') {
    return (
      <video
        src={assetUrl(media.url)}
        preload="metadata"
        muted
        controls={interactive}
        aria-label={media.alt ?? 'Vídeo'}
        className={`bg-slate-900 object-contain ${interactive ? '' : 'pointer-events-none'} ${className}`}
      />
    );
  }

  const small = media.variants[0];
  return (
    <img
      src={assetUrl(small?.url ?? media.url)}
      alt={media.alt ?? ''}
      width={small?.width ?? media.width ?? undefined}
      height={small?.height ?? media.height ?? undefined}
      loading="lazy"
      className={`bg-slate-100 object-cover ${className}`}
    />
  );
}
