/**
 * Phase 28 API envelope helpers for Playwright contract tests.
 * Supports `{ ok, data }` / `{ ok, error: { message } }` and legacy `{ success, error }`.
 */

export function readApiErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "";
  const b = body as Record<string, unknown>;
  if (b.ok === false && b.error && typeof b.error === "object" && b.error !== null) {
    const m = (b.error as Record<string, unknown>).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  if (typeof b.error === "string") return b.error;
  return "";
}

export function readApiData<T extends Record<string, unknown> = Record<string, unknown>>(
  body: unknown
): T | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (b.ok === true && b.data && typeof b.data === "object" && !Array.isArray(b.data)) {
    return b.data as T;
  }
  return null;
}

export function isApiSuccess(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (b.ok === true) return true;
  if (b.success === true) return true;
  return false;
}
