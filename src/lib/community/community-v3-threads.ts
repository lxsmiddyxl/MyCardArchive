import { isUuidString } from "@/lib/server/is-uuid";

export const COMMUNITY_THREAD_PREFIX = "[mca:thread:";

export function threadIdFromBody(body: string): string | null {
  const line = body.split("\n")[0]?.trim() ?? "";
  if (!line.startsWith(COMMUNITY_THREAD_PREFIX) || !line.endsWith("]")) return null;
  const inner = line.slice(COMMUNITY_THREAD_PREFIX.length, -1);
  return isUuidString(inner) ? inner : null;
}

export function withThreadIdPrefix(body: string, threadId: string): string {
  const stripped = body
    .split("\n")
    .filter((l) => !l.trim().startsWith(COMMUNITY_THREAD_PREFIX))
    .join("\n")
    .trim();
  return `${COMMUNITY_THREAD_PREFIX}${threadId}]\n${stripped}`.trim();
}

export function stripThreadPrefix(body: string): string {
  const lines = body.split("\n");
  if (lines[0]?.trim().startsWith(COMMUNITY_THREAD_PREFIX)) {
    return lines.slice(1).join("\n").trim();
  }
  return body.trim();
}
