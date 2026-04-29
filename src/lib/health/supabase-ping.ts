import "server-only";

/**
 * Lightweight PostgREST reachability check (anon key). Does not bypass RLS or expose secrets.
 * Suitable for health endpoints when service role is not configured (e.g. CI).
 */
export async function pingSupabaseRest(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return false;
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}
