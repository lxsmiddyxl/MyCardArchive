"use client";

import { useCallback, useState } from "react";

export type UseAsyncStateReturn<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  reset: () => void;
  run: <R>(fn: () => Promise<R>) => Promise<{ ok: true; value: R } | { ok: false }>;
};

/**
 * Shared loading / error surface for one-shot async work (not subscriptions).
 */
export function useAsyncState<T = unknown>(): UseAsyncStateReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const run = useCallback(async <R,>(fn: () => Promise<R>) => {
    setLoading(true);
    setError(null);
    try {
      const value = await fn();
      setData(value as unknown as T);
      return { ok: true as const, value };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      return { ok: false as const };
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, setData, setLoading, setError, reset, run };
}
