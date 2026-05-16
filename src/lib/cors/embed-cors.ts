const DEFAULT_EMBED_ORIGINS = [
  "https://mycardarchive.com",
  "https://www.mycardarchive.com",
] as const;

/** Parse `MCA_EMBED_ALLOWLIST` (comma-separated origins or hostnames). */
export function parseEmbedAllowlist(raw?: string): string[] {
  const fromEnv = raw
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeEmbedOrigin);
  if (fromEnv?.length) return fromEnv;
  return [...DEFAULT_EMBED_ORIGINS];
}

function normalizeEmbedOrigin(entry: string): string {
  if (entry.startsWith("http://") || entry.startsWith("https://")) return entry;
  return `https://${entry}`;
}

/** CSP `frame-ancestors` for embed routes. */
export function embedFrameAncestorsDirective(allowlist?: string[]): string {
  const origins = allowlist ?? parseEmbedAllowlist(process.env.MCA_EMBED_ALLOWLIST);
  return `frame-ancestors ${origins.join(" ")}`;
}

/** CORS allow-origin for embed API preflight. */
export function embedCorsAllowOrigin(
  requestOrigin: string | null,
  allowlist?: string[]
): string | null {
  if (!requestOrigin) return null;
  const allowed = allowlist ?? parseEmbedAllowlist(process.env.MCA_EMBED_ALLOWLIST);
  return allowed.includes(requestOrigin) ? requestOrigin : null;
}
