const DEFAULT_SITE = "https://mycardarchive.com";

/** Canonical site origin from `NEXT_PUBLIC_SITE_URL` (no trailing slash). */
export function getCanonicalSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return DEFAULT_SITE;
  return raw.replace(/\/$/, "");
}

/** Build absolute canonical URL for a path segment. */
export function toCanonicalUrl(path: string): string {
  const origin = getCanonicalSiteOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalized}`;
}

/** True when host should redirect to apex (www → root). */
export function shouldRedirectWwwToApex(host: string | null): boolean {
  if (!host) return false;
  const h = host.toLowerCase();
  return h.startsWith("www.") && h.endsWith("mycardarchive.com");
}

export function apexHostFromWww(host: string): string {
  return host.replace(/^www\./i, "");
}
