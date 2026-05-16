/** Increment collector number for “add next in set” (e.g. 121/198 → 122/198). */
export function incrementCollectorNumber(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "1";

  const slash = trimmed.split("/");
  const head = slash[0]?.replace(/[^\d]/g, "") ?? "";
  const tail = slash[1]?.trim();

  if (!head) return trimmed;
  const next = String(parseInt(head, 10) + 1);
  if (!Number.isFinite(parseInt(head, 10))) return trimmed;
  if (tail) return `${next}/${tail}`;
  return next;
}

export function buildNextInSetAddCardUrl(input: {
  binderId: string;
  setId: string;
  number: string;
  setName?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set("set_id", input.setId.trim());
  sp.set("number", incrementCollectorNumber(input.number));
  if (input.setName?.trim()) sp.set("set_name", input.setName.trim());
  sp.set("next_in_set", "1");
  return `/binders/${encodeURIComponent(input.binderId)}/add-card?${sp.toString()}`;
}
