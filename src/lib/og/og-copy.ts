export function truncateOgTitle(text: string, max = 64): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function truncateOgSubtitle(text: string, max = 96): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function formatTradeIdPreview(id: string): string {
  const x = id.replace(/-/g, "").trim();
  if (x.length <= 14) return id;
  return `${x.slice(0, 8)}…${x.slice(-4)}`;
}

export function formatUserIdPreview(id: string): string {
  return formatTradeIdPreview(id);
}
