import { useCallback, useSyncExternalStore } from 'react';

/** Sem `matchMedia` (testes em jsdom), vale o layout de desktop. */
const query = (media: string): MediaQueryList | null =>
  typeof window.matchMedia === 'function' ? window.matchMedia(media) : null;

/** Acompanha uma media query CSS; usado só onde o comportamento muda, não só o estilo. */
export function useMediaQuery(media: string, fallback: boolean): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = query(media);
      list?.addEventListener('change', onChange);
      return () => list?.removeEventListener('change', onChange);
    },
    [media],
  );
  return useSyncExternalStore(subscribe, () => query(media)?.matches ?? fallback);
}

/** Mesmo corte do CSS do shell: abaixo de 1024 px o menu vira gaveta. */
export const DESKTOP_MEDIA = '(min-width: 64rem)';
