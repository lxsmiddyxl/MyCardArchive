export type DeckLegalityFormat = "standard" | "expanded" | "unlimited" | "commander";

export type LegalityIssue = {
  card_id: string;
  name: string;
  reason: string;
};

type CatalogLegalityRow = {
  id: string;
  name: string;
  supertype: string | null;
  subtypes: string[] | null;
  legal_standard: boolean | null;
  legal_expanded: boolean | null;
  legal_unlimited: boolean | null;
  legal_commander: boolean | null;
};

type CardRow = {
  id: string;
  name: string;
  catalog_card_id: string | null;
  catalog_cards: CatalogLegalityRow | CatalogLegalityRow[] | null;
};

export type DeckCardRow = {
  card_id: string;
  quantity: number;
  section: string;
  cards: CardRow | CardRow[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function normalizeDeckFormat(raw: string | null | undefined): DeckLegalityFormat {
  const f = (raw ?? "standard").toLowerCase().trim();
  if (f === "commander") return "commander";
  if (f === "expanded") return "expanded";
  if (f === "unlimited") return "unlimited";
  if (f === "standard" || f === "modern") return "standard";
  return "unlimited";
}

function isBasicEnergy(
  catalog: { supertype: string | null; subtypes: string[] | null; name: string } | null,
  cardName: string
): boolean {
  if (catalog) {
    const st = (catalog.supertype ?? "").toLowerCase();
    const subs = (catalog.subtypes ?? []).map((s) => String(s).toLowerCase());
    if (st === "energy" && subs.includes("basic")) return true;
    const cn = catalog.name.toLowerCase();
    if (st === "energy" && cn.includes("basic")) return true;
  }
  const n = cardName.toLowerCase();
  return n.includes("basic") && n.includes("energy");
}

function catalogLegalForFormat(cc: CatalogLegalityRow | null, format: DeckLegalityFormat): boolean {
  if (!cc) return false;
  const ls = cc.legal_standard ?? true;
  const le = cc.legal_expanded ?? true;
  const lu = cc.legal_unlimited ?? true;
  const lc = cc.legal_commander ?? true;
  switch (format) {
    case "standard":
      return ls;
    case "expanded":
      return le;
    case "unlimited":
      return lu;
    case "commander":
      return lc;
    default:
      return true;
  }
}

export function computeLegality(
  format: DeckLegalityFormat,
  rows: DeckCardRow[]
): { legal: boolean; issues: LegalityIssue[] } {
  const issues: LegalityIssue[] = [];

  const flatRows: {
    card_id: string;
    quantity: number;
    section: string;
    name: string;
    catalog: CatalogLegalityRow | null;
    catalog_key: string;
    basic: boolean;
  }[] = [];

  for (const row of rows) {
    const card = firstRelation(row.cards);
    if (!card) continue;
    const cc = firstRelation(card.catalog_cards ?? null);
    const name = card.name ?? "Unknown";
    const basic = isBasicEnergy(cc, name);
    const key =
      (card.catalog_card_id?.trim() || "").length > 0
        ? card.catalog_card_id!
        : `name:${name.toLowerCase()}`;
    flatRows.push({
      card_id: card.id,
      quantity: Math.max(0, row.quantity),
      section: (row.section ?? "main").trim().toLowerCase() || "main",
      name,
      catalog: cc,
      catalog_key: key,
      basic,
    });
  }

  const mainSum = flatRows
    .filter((r) => r.section === "main")
    .reduce((s, r) => s + r.quantity, 0);
  const sideSum = flatRows
    .filter((r) => r.section === "sideboard")
    .reduce((s, r) => s + r.quantity, 0);
  const cmdRows = flatRows.filter((r) => r.section === "commander");

  if (format === "standard" || format === "expanded") {
    if (mainSum !== 60) {
      issues.push({
        card_id: "",
        name: "Deck",
        reason: `Main deck must be exactly 60 cards for ${format} (currently ${mainSum}).`,
      });
    }
    if (sideSum > 15) {
      issues.push({
        card_id: "",
        name: "Deck",
        reason: `Side deck cannot exceed 15 cards for ${format} (currently ${sideSum}).`,
      });
    }
  }

  if (format === "commander") {
    if (mainSum !== 100) {
      issues.push({
        card_id: "",
        name: "Deck",
        reason: `Brawl main deck must be exactly 100 cards (currently ${mainSum}).`,
      });
    }
    const cmdCount = cmdRows.reduce((s, r) => s + r.quantity, 0);
    if (cmdCount !== 1 && cmdRows.length > 0) {
      issues.push({
        card_id: "",
        name: "Brawl",
        reason: `Brawl zone should contain exactly one card (currently ${cmdCount} total).`,
      });
    }
  }

  const copyBuckets = new Map<
    string,
    { qty: number; name: string; sampleCardId: string; basic: boolean }
  >();
  for (const r of flatRows) {
    if (r.section === "commander") continue;
    const existing = copyBuckets.get(r.catalog_key);
    const add = r.quantity;
    if (existing) {
      existing.qty += add;
    } else {
      copyBuckets.set(r.catalog_key, {
        qty: add,
        name: r.name,
        sampleCardId: r.card_id,
        basic: r.basic,
      });
    }
  }

  for (const [, v] of Array.from(copyBuckets.entries())) {
    if (v.basic) continue;
    if (format === "commander") {
      if (v.qty > 1) {
        issues.push({
          card_id: v.sampleCardId,
          name: v.name,
          reason: `Brawl format allows only one copy of each non–Basic Energy card (found ${v.qty}).`,
        });
      }
    } else if (format === "standard" || format === "expanded") {
      if (v.qty > 4) {
        issues.push({
          card_id: v.sampleCardId,
          name: v.name,
          reason: `Too many copies (${v.qty}); maximum 4 per card except Basic Energy.`,
        });
      }
    }
  }

  if (format !== "unlimited") {
    const checked = new Set<string>();
    for (const r of flatRows) {
      if (checked.has(r.card_id)) continue;
      checked.add(r.card_id);
      if (!r.catalog) {
        issues.push({
          card_id: r.card_id,
          name: r.name,
          reason: `No catalog match; cannot confirm ${format} legality.`,
        });
        continue;
      }
      if (!catalogLegalForFormat(r.catalog, format)) {
        issues.push({
          card_id: r.card_id,
          name: r.name,
          reason: `Card not legal in ${format}.`,
        });
      }
    }
  }

  return { legal: issues.length === 0, issues };
}
