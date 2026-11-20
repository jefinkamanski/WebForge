import type { MediaItem } from '@webforge/shared';
import { mediaUrl } from '../../lib/api.ts';

export interface MediaThumbProps {
  item: MediaItem;
  className?: string;
}

// Miniatura quadrada de uma mídia (imagem ou primeiro quadro do vídeo)
export function MediaThumb({ item, className = 'aspect-square w-full' }: MediaThumbProps) {
  const common = `${className} rounded-md bg-muted object-cover`;
  if (item.kind === 'video') {
    return (
      <div className="relative">
        <video src={mediaUrl(item.url)} preload="metadata" muted className={common} />
        <span className="bg-foreground/80 text-background absolute bottom-1 left-1 rounded-sm px-1.5 py-0.5 text-xs font-medium">
          Vídeo
        </span>
      </div>
    );
  }
  return (
    <img
      src={mediaUrl(item.url)}
      alt={item.alt}
      loading="lazy"
      width={item.width ?? undefined}
      height={item.height ?? undefined}
      className={common}
    />
  );
}
