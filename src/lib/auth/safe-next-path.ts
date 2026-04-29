/**
 * Only allow same-origin relative paths (prevents open redirects after auth).
 *
 * Policy: `next` is normalized to the **path segment only** (query string and
 * hash are stripped). Middleware may still append the full original path +
 * search to `?next=` for unauthenticated redirects; after password login the
 * client uses this helper so **search params on `next` are not preserved**.
 * Preserve deep-link queries via app-specific state or OAuth callback params
 * if product requirements change.
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = "/feed"
): string {
  if (raw == null || typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  const pathOnly = t.split(/[?#]/)[0] ?? "";
  return pathOnly.length > 0 ? pathOnly : fallback;
}
