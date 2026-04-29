import type { Database } from "@/lib/supabase/types";
import { censor, isOffensive } from "@/lib/validation/profanity";

type ProfileNames = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "display_name" | "handle" | "username"
> | {
    display_name?: string | null;
    handle?: string | null;
    username?: string | null;
  };

const FALLBACK = "Anonymous Trainer";

function rawLabel(row: ProfileNames | null | undefined): string | null {
  if (!row) return null;
  const dn = typeof row.display_name === "string" ? row.display_name.trim() : "";
  if (dn) return dn;
  const h = typeof row.handle === "string" ? row.handle.trim() : "";
  if (h) return `@${h}`;
  const u = typeof row.username === "string" ? row.username.trim() : "";
  if (u) return u;
  return null;
}

/**
 * Public author label: display_name → @handle → username → censored offensive → anonymous.
 */
export function resolveAuthor(row: ProfileNames | null | undefined): string {
  const label = rawLabel(row);
  if (!label) return FALLBACK;
  if (isOffensive(label)) return censor(label).trim() || FALLBACK;
  return label;
}

/** Same rules using loose social_public_profiles-shaped rows. */
export function resolveAuthorFromSocial(row: {
  display_name?: string | null;
  handle?: string | null;
  username?: string | null;
} | null | undefined): string {
  return resolveAuthor(row ?? null);
}

/** @deprecated Use `resolveAuthor` */
export function resolveAuthorName(row: ProfileNames | null | undefined): string {
  return resolveAuthor(row);
}
