/** Canonical site origin (no trailing slash). */
export function mcaSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";
}

export function mcaAbsoluteUrl(path: string): string {
  const base = mcaSiteUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
