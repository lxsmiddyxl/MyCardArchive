import { sanitizePlainTextUserInput } from "@/lib/server/sanitize-user-text";

const MAX_LONG_FORM = 12000;

/** Sanitized markdown-style body (no HTML tags). */
export function sanitizeShowcaseLongForm(raw: string): string {
  const plain = sanitizePlainTextUserInput(raw, MAX_LONG_FORM);
  return plain.replace(/\r\n/g, "\n");
}

export type ShowcaseVersionSnapshotDTO = {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  longFormBody: string | null;
  createdAt: string;
};

export function mapShowcaseVersionRow(row: {
  id: string;
  seq: number;
  title: string;
  description: string | null;
  long_form_body: string | null;
  created_at: string;
}): ShowcaseVersionSnapshotDTO {
  return {
    id: row.id,
    seq: row.seq,
    title: row.title,
    description: row.description,
    longFormBody: row.long_form_body,
    createdAt: row.created_at,
  };
}
