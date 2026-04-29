/**
 * Resilient fetch: retries transient failures, optional per-attempt timeout.
 * Does not retry 4xx except 429.
 */

export type FetchWithRetryOptions = RequestInit & {
  retries?: number;
  retryDelayMs?: number;
  /** When true, retry on network throw (offline blips). Default true. */
  retryOnNetworkError?: boolean;
  /** Abort the attempt after this many ms (each attempt gets a fresh timer). */
  timeoutMs?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldRetryResponse(res: Response): boolean {
  if (res.status === 429) return true;
  if (res.status === 408) return true;
  if (res.status >= 500 && res.status <= 599) return true;
  return false;
}

function mergeAbortSignals(user: AbortSignal | undefined, inner: AbortSignal): AbortSignal {
  if (!user) return inner;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any([user, inner]);
  }
  return inner;
}

function defaultTimeoutMs(method: string): number {
  const m = method.toUpperCase();
  return m === "GET" || m === "HEAD" ? 20_000 : 30_000;
}

function isAbortError(e: unknown): boolean {
  return (
    e instanceof DOMException ||
    (e instanceof Error && (e.name === "AbortError" || e.message.includes("aborted")))
  );
}

/**
 * @param input Same as fetch
 * @param init Retries default to 2 (3 attempts total) for POST/PATCH/DELETE; GET defaults to 1 retry.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: FetchWithRetryOptions
): Promise<Response> {
  const {
    retries: retriesOpt,
    retryDelayMs = 400,
    retryOnNetworkError = true,
    timeoutMs: timeoutOpt,
    ...rest
  } = init ?? {};
  const method = (rest.method ?? "GET").toUpperCase();
  const defaultRetries = method === "GET" || method === "HEAD" ? 1 : 2;
  const retries = retriesOpt ?? defaultRetries;
  const timeoutMs = timeoutOpt ?? defaultTimeoutMs(method);

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    const signal = mergeAbortSignals(rest.signal ?? undefined, controller.signal);
    try {
      const res = await fetch(input, { ...rest, signal });
      clearTimeout(tid);
      if (!shouldRetryResponse(res) || attempt === retries) {
        return res;
      }
      const retryAfter = res.headers.get("Retry-After");
      const extra =
        retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : 0;
      await sleep(retryDelayMs * Math.pow(2, attempt) + extra);
    } catch (e) {
      clearTimeout(tid);
      if (rest.signal?.aborted) {
        throw e;
      }
      lastErr = e;
      const aborted = isAbortError(e);
      if (aborted && attempt < retries) {
        await sleep(retryDelayMs * Math.pow(2, attempt));
        continue;
      }
      if (!retryOnNetworkError || attempt === retries) {
        throw e;
      }
      await sleep(retryDelayMs * Math.pow(2, attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("fetchWithRetry: exhausted retries");
}
