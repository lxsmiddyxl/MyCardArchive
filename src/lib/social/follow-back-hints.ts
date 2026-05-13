/**
 * Non-intrusive follow-back hints: people you follow who have not followed you back (Phase 66).
 */
export function pickFollowBackCandidates(params: {
  iFollow: ReadonlySet<string>;
  followsMe: ReadonlySet<string>;
  myId: string;
  max?: number;
}): string[] {
  const max = params.max ?? 12;
  const out: string[] = [];
  for (const uid of params.iFollow) {
    if (uid === params.myId) continue;
    if (params.followsMe.has(uid)) continue;
    out.push(uid);
    if (out.length >= max) break;
  }
  return out;
}
