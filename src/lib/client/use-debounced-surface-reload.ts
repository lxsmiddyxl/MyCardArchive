import { useCallback, useEffect, useRef } from "react";

/**
 * Debounces repeated reload triggers (e.g. window CustomEvent bursts after coalesced dispatch).
 * Accepts loaders that return async state machine results (`run()` from `useAsyncState`, etc.).
 */
export function useDebouncedSurfaceReload(
  load: () => void | Promise<void> | unknown | Promise<unknown>,
  delayMs = 180
): () => void {
  const timerRef = useRef<number | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  const schedule = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void loadRef.current();
    }, delayMs);
  }, [delayMs]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    []
  );

  return schedule;
}
