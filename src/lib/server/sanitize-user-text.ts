/**
 * Strip angle-bracket tags and control characters from user-authored text (defense in depth).
 * Does not HTML-encode — store plain text; render with React escaping.
 */
export function sanitizePlainTextUserInput(raw: string, maxLen: number): string {
  const noTags = raw.replace(/<[^>]{0,400}?>/g, "");
  const noControls = noTags.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  const collapsed = noControls.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLen) return collapsed;
  return collapsed.slice(0, maxLen).trimEnd();
}
