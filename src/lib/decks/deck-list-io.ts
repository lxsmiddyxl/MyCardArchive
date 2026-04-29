export type ParsedDeckLine = {
  name: string;
  quantity: number;
};

const SHOWDOWN = /^\s*(\d+)\s+(.+?)\s*$/;
const TXT = /^\s*(\d+)\s*[xX×]\s*(.+?)\s*$/;
const TXT_COMPACT = /^\s*(\d+)x\s*(.+?)\s*$/i;
const TCGPLAYER = /^(.+?)\s*[–-]\s*(\d+)\s*$/;

function normalizeName(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Parse a single line using Showdown, TXT, or TCGPlayer-style patterns.
 */
export function parseDeckListLine(line: string): ParsedDeckLine | null {
  const raw = line.trim();
  if (!raw || raw.startsWith("#")) return null;

  let m = raw.match(TXT);
  if (!m) m = raw.match(TXT_COMPACT);
  if (m) {
    const qty = parseInt(m[1], 10);
    if (!Number.isFinite(qty) || qty < 1) return null;
    const name = normalizeName(m[2]);
    if (!name) return null;
    return { name, quantity: qty };
  }

  m = raw.match(TCGPLAYER);
  if (m) {
    const name = normalizeName(m[1]);
    const qty = parseInt(m[2], 10);
    if (!name || !Number.isFinite(qty) || qty < 1) return null;
    return { name, quantity: qty };
  }

  m = raw.match(SHOWDOWN);
  if (m) {
    const qty = parseInt(m[1], 10);
    if (!Number.isFinite(qty) || qty < 1) return null;
    const name = normalizeName(m[2]);
    if (!name) return null;
    return { name, quantity: qty };
  }

  return null;
}

export function parseDeckListTextWithDisplayNames(
  text: string
): { nameLower: string; displayName: string; quantity: number }[] {
  const merged = new Map<string, { displayName: string; qty: number }>();
  for (const line of text.split(/\r?\n/)) {
    const parsed = parseDeckListLine(line);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    const prev = merged.get(key);
    if (prev) {
      merged.set(key, {
        displayName: prev.displayName,
        qty: prev.qty + parsed.quantity,
      });
    } else {
      merged.set(key, { displayName: parsed.name, qty: parsed.quantity });
    }
  }
  return [...merged.entries()].map(([nameLower, v]) => ({
    nameLower,
    displayName: v.displayName,
    quantity: v.qty,
  }));
}

export type ExportFormat = "tcgplayer" | "showdown" | "txt" | "mtgo";

export function formatDeckExportLine(
  name: string,
  quantity: number,
  format: ExportFormat
): string {
  switch (format) {
    case "showdown":
    case "mtgo":
      return `${quantity} ${name}`;
    case "txt":
      return `${quantity}x ${name}`;
    case "tcgplayer":
    default:
      return `${name} – ${quantity}`;
  }
}

type ExportZoneRow = { name: string; quantity: number };

function zoneLines(rows: ExportZoneRow[], format: ExportFormat): string[] {
  const list = [...rows];
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list.map((r) => formatDeckExportLine(r.name, r.quantity, format));
}

export function buildDeckExportDocument(
  zones: {
    main: ExportZoneRow[];
    sideboard: ExportZoneRow[];
    commander: ExportZoneRow[];
  },
  format: ExportFormat
): string {
  const blocks: string[] = [];
  const mainBlock = zoneLines(zones.main, format);
  if (mainBlock.length) blocks.push(mainBlock.join("\n"));
  const sideBlock = zoneLines(zones.sideboard, format);
  if (sideBlock.length) blocks.push(sideBlock.join("\n"));
  const cmdBlock = zoneLines(zones.commander, format);
  if (cmdBlock.length) blocks.push(cmdBlock.join("\n"));
  return blocks.join("\n\n");
}

export type OwnedCardRef = { id: string; name: string };

/**
 * Exact (case-insensitive) match, then unique partial substring match.
 */
export function matchCardName(
  searchDisplay: string,
  searchLower: string,
  owned: OwnedCardRef[]
): { id: string; name: string } | null {
  const exact = owned.find((c) => c.name.toLowerCase() === searchLower);
  if (exact) return { id: exact.id, name: exact.name };

  const partial = owned.filter(
    (c) =>
      c.name.toLowerCase().includes(searchLower) ||
      searchLower.includes(c.name.toLowerCase())
  );
  if (partial.length === 1) return { id: partial[0].id, name: partial[0].name };
  return null;
}
