import { fetchWithRetry } from "@/lib/http/fetch-with-retry";
import type { UserMatch } from "@/lib/matching/types";

const json = async <T>(res: Response): Promise<T> => {
  return (await res.json().catch(() => ({}))) as T;
};

const fetchOpts = {
  cache: "no-store" as const,
  credentials: "include" as const,
};

export async function fetchWhoWantsMyCards(): Promise<
  { ok: true; matches: UserMatch[] } | { ok: false; error: string }
> {
  const res = await fetchWithRetry("/api/matching/who-wants-my-cards", fetchOpts);
  const body = await json<{ matches?: UserMatch[]; error?: string }>(res);
  if (!res.ok) return { ok: false, error: body.error ?? "Failed to load matches" };
  return { ok: true, matches: Array.isArray(body.matches) ? body.matches : [] };
}

export async function fetchWhoHasWhatIWant(): Promise<
  { ok: true; matches: UserMatch[] } | { ok: false; error: string }
> {
  const res = await fetchWithRetry("/api/matching/who-has-what-i-want", fetchOpts);
  const body = await json<{ matches?: UserMatch[]; error?: string }>(res);
  if (!res.ok) return { ok: false, error: body.error ?? "Failed to load matches" };
  return { ok: true, matches: Array.isArray(body.matches) ? body.matches : [] };
}

export async function fetchTopMatches(limit?: number): Promise<
  { ok: true; matches: UserMatch[] } | { ok: false; error: string }
> {
  const q =
    limit !== undefined && Number.isFinite(limit)
      ? `?limit=${encodeURIComponent(String(Math.min(100, Math.max(1, limit))))}`
      : "";
  const res = await fetchWithRetry(`/api/matching/top-matches${q}`, fetchOpts);
  const body = await json<{ matches?: UserMatch[]; error?: string }>(res);
  if (!res.ok) return { ok: false, error: body.error ?? "Failed to load matches" };
  return { ok: true, matches: Array.isArray(body.matches) ? body.matches : [] };
}
