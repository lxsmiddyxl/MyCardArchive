const NOTE_PREFIX = (showcaseId: string) => `[[mca:showcase-note:${showcaseId}]]\n`;

export function formatShowcaseNoteBody(showcaseId: string, note: string): string {
  return `${NOTE_PREFIX(showcaseId)}${note}`;
}

export function parseShowcaseNoteBody(showcaseId: string, body: string): string | null {
  const p = NOTE_PREFIX(showcaseId);
  if (!body.startsWith(p)) return null;
  return body.slice(p.length).trim() || null;
}

export function isShowcaseNotePost(showcaseId: string, body: string): boolean {
  return body.startsWith(NOTE_PREFIX(showcaseId));
}
