/**
 * Helpers for raw `fetch().json()` when callers do not use `fetchJson`.
 * Supports Phase 28 `{ ok, data }` / `{ ok, error: { code, message } }` plus legacy `{ success, ... }`.
 */

export function extractApiPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.ok === true && r.data && typeof r.data === "object" && !Array.isArray(r.data)) {
    return r.data as Record<string, unknown>;
  }
  return r;
}

export function extractApiErrorMessage(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.ok === false && r.error && typeof r.error === "object" && r.error !== null) {
    const e = r.error as Record<string, unknown>;
    if (typeof e.message === "string" && e.message.trim()) return e.message;
  }
  if (r.success === false && typeof r.error === "string") return r.error;
  if (typeof r.error === "string") return r.error;
  return null;
}

export function isApiSuccessEnvelope(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  if (r.ok === true) return true;
  if (r.success === true) return true;
  return false;
}
