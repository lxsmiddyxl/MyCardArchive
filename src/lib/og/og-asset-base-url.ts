import "server-only";

/**
 * Absolute origin for embedding `/public` artwork and icons in OG `ImageResponse`.
 * Prefer forwarded headers when invoked from HTTP; otherwise env or localhost.
 */
export function getOgAssetBaseUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim() ?? "";

  if (env) {
    return env;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return host.replace(/\/$/, "");
  }

  return "http://127.0.0.1:3000";
}

export function ogPublicFileUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getOgAssetBaseUrl()}${p}`;
}
