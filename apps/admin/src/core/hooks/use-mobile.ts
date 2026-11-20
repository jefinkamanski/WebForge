import { useSyncExternalStore } from 'react';

// Abaixo de 768px (md) o menu lateral vira gaveta
const query = '(max-width: 767px)';

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
