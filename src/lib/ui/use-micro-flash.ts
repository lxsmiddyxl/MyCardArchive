import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Brief visual highlight (e.g. ring / opacity) without layout shift.
 * Auto-clears after `durationMs` to avoid extra renders piling up.
 */
export function useMicroFlash(durationMs = 200) {
  const [active, setActive] = useState(false);
  const tRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const trigger = useCallback(() => {
    setActive(true);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      setActive(false);
      tRef.current = undefined;
    }, durationMs);
  }, [durationMs]);

  useEffect(() => {
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, []);

  return { active, trigger };
}
