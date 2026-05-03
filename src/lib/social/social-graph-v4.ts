/** Social Graph v4 — qualitative narrative only (matches `user_social_graph_v4.narrative` JSON). */

export type SocialGraphV4Narrative = {
  socialEcho: string | null;
  tasteEcho: string | null;
  identityBridge: string | null;
  ambientEcho: string | null;
  headline: string | null;
};

const EMPTY: SocialGraphV4Narrative = {
  socialEcho: null,
  tasteEcho: null,
  identityBridge: null,
  ambientEcho: null,
  headline: null,
};

function readStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

export function parseSocialGraphV4Narrative(raw: unknown): SocialGraphV4Narrative {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY };
  }
  const j = raw as Record<string, unknown>;
  return {
    socialEcho: readStr(j.socialEcho),
    tasteEcho: readStr(j.tasteEcho),
    identityBridge: readStr(j.identityBridge),
    ambientEcho: readStr(j.ambientEcho),
    headline: readStr(j.headline),
  };
}

/** Short line for feed tooltips — no numeric scores. */
export function socialGraphV4FeedEchoLine(n: SocialGraphV4Narrative): string | null {
  const parts = [n.headline, n.socialEcho, n.tasteEcho].map((s) => s?.trim()).filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return parts.slice(0, 2).join(" · ");
}
