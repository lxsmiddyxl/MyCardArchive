/**
 * Privacy-safe path bucketing for analytics (Phase 61).
 * Replaces UUID-like segments so routes never ship raw ids to client telemetry.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function redactPathForAnalytics(pathname: string): string {
  const raw = pathname.trim() || "/";
  const parts = raw.split("/").filter(Boolean);
  const out = parts.map((p) => (UUID_RE.test(p) ? ":id" : p));
  return `/${out.join("/")}` || "/";
}

export function surfaceFromPath(redacted: string): string {
  const seg = redacted.replace(/^\//, "").split("/")[0] ?? "";
  if (!seg || seg === ":id") return "home";
  return seg.slice(0, 48);
}
