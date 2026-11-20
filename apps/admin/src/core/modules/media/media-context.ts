import type { MediaItem } from '@webforge/shared';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface MediaLibraryContext {
  // Mídias já carregadas (citadas no conteúdo ou escolhidas agora), por id
  media: Record<number, MediaItem>;
  addMedia: (item: MediaItem) => void;
}

// Usado pelos campos de mídia (seções e posts) para mostrar as miniaturas
export const MediaLibrary = createContext<MediaLibraryContext>({
  media: {},
  addMedia: () => undefined,
});

export const useMediaLibrary = () => useContext(MediaLibrary);

// Estado do contexto para uma tela de edição: começa com as mídias vindas da API
export function useMediaLibraryState(initial: Record<number, MediaItem>) {
  const [media, setMedia] = useState(initial);
  const addMedia = useCallback((item: MediaItem) => {
    setMedia((current) => ({ ...current, [item.id]: item }));
  }, []);
  const value = useMemo(() => ({ media, addMedia }), [media, addMedia]);
  return { value, setMedia };
}
