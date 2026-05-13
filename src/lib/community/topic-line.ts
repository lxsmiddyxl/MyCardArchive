const TOPIC_RE = /^\[mca:topic:([a-z0-9_-]{1,32})\]\n/;

export function normalizeCommunityTopicSlug(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,32}$/.test(s)) return null;
  return s;
}

export function withCommunityTopicLine(topicSlug: string, body: string): string {
  const t = normalizeCommunityTopicSlug(topicSlug);
  if (!t) return body;
  return `[mca:topic:${t}]\n${body}`;
}

export function splitCommunityTopicBody(body: string): { topic_slug: string | null; text: string } {
  const m = body.match(TOPIC_RE);
  if (!m || !m[1]) return { topic_slug: null, text: body };
  return { topic_slug: m[1], text: body.slice(m[0].length) };
}
