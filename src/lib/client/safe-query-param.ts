/**
 * Read a single query param with trimming; never throws.
 * Accepts `URLSearchParams` or Next.js `useSearchParams()` (readonly) — both implement `.get`.
 */
export type SearchParamSource = { get(name: string): string | null };

export function safeQueryParam(
  searchParams: SearchParamSource,
  name: string,
  fallback = ""
): string {
  const v = searchParams.get(name);
  return typeof v === "string" ? v.trim() : fallback;
}
