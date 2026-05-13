/**
 * Safe read-only snippets for community feed v1 (Phase 63).
 */
export function snippetForCommunityFeedV1(body: string, maxLen = 280): string {
  const trimmed = body.replace(/\u0000/g, "").trim();
  const collapsed = trimmed.replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f]/g, " ");
  if (collapsed.length <= maxLen) return collapsed;
  return `${collapsed.slice(0, maxLen - 1)}…`;
}
