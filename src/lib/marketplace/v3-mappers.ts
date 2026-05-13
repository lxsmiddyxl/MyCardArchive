import type {
  MarketplaceDiscoveryCardsV3DTO,
  MarketplaceListingV3DTO,
  MarketplaceOfferV3DTO,
  MarketplacePriceSignalV3DTO,
} from "@/lib/dto/marketplace-v3";
import { buildStructuredOfferSummary, normalizeStructuredItems } from "@/lib/market/structured-offer";

type DiscoveryRow = { catalog_card_id?: string; collector_count?: number; card_count?: number };

function asDiscoveryRows(raw: unknown): DiscoveryRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === "object") as DiscoveryRow[];
}

export function mapDiscoveryJsonToCardsV3(json: unknown): MarketplaceDiscoveryCardsV3DTO {
  const o = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const want = asDiscoveryRows(o.want_by_catalog).map(mapListingRow("looking_for"));
  const offer = asDiscoveryRows(o.offer_by_catalog).map(mapListingRow("for_trade"));
  const hintsRaw = Array.isArray(o.match_hints) ? o.match_hints : [];
  const match_hints = hintsRaw
    .filter((h) => h && typeof h === "object")
    .map((h) => {
      const r = h as { catalog_card_id?: string; match_kind?: string };
      return {
        catalog_card_id: typeof r.catalog_card_id === "string" ? r.catalog_card_id : "",
        match_kind: typeof r.match_kind === "string" ? r.match_kind : "unknown",
      };
    })
    .filter((h) => h.catalog_card_id.length > 0);
  return { want_by_catalog: want, offer_by_catalog: offer, match_hints };
}

function mapListingRow(intent: "for_trade" | "looking_for") {
  return (row: DiscoveryRow): MarketplaceListingV3DTO => ({
    catalog_card_id: typeof row.catalog_card_id === "string" ? row.catalog_card_id : "",
    intent,
    collector_count: typeof row.collector_count === "number" ? row.collector_count : 0,
    card_count: typeof row.card_count === "number" ? row.card_count : 0,
  });
}

export function buildPriceSignalsFromListings(
  want: MarketplaceListingV3DTO[],
  offer: MarketplaceListingV3DTO[],
  limit = 12
): MarketplacePriceSignalV3DTO[] {
  const byId = new Map<string, { collectors: number; cards: number }>();
  const bump = (row: MarketplaceListingV3DTO, w: number) => {
    if (!row.catalog_card_id) return;
    const cur = byId.get(row.catalog_card_id) ?? { collectors: 0, cards: 0 };
    cur.collectors += row.collector_count * w;
    cur.cards += row.card_count * w;
    byId.set(row.catalog_card_id, cur);
  };
  for (const r of offer) bump(r, 1);
  for (const r of want) bump(r, 0.85);
  const scored = [...byId.entries()].map(([catalog_card_id, v]) => {
    const raw = v.collectors * 12 + v.cards * 3;
    const relative_interest_0_100 = Math.min(100, Math.round(Math.log1p(raw) * 22));
    let tone: MarketplacePriceSignalV3DTO["tone"] = "steady";
    if (relative_interest_0_100 >= 62) tone = "rising_interest";
    else if (relative_interest_0_100 <= 28) tone = "cooling";
    const caption =
      tone === "rising_interest"
        ? "Collectors are circling this catalog card more than usual."
        : tone === "cooling"
          ? "Softer hobby signal — fewer active flags right now."
          : "Typical rotation — balanced looking-for and for-trade energy.";
    return { catalog_card_id, relative_interest_0_100, tone, caption };
  });
  scored.sort((a, b) => b.relative_interest_0_100 - a.relative_interest_0_100);
  return scored.slice(0, limit);
}

export function mapMarketOfferRowToV3DTO(row: {
  id: string;
  thread_id: string;
  status: string;
  catalog_card_id: string | null;
  created_at: string;
  updated_at: string;
  body: string;
  items_offered?: unknown;
  items_requested?: unknown;
}): MarketplaceOfferV3DTO {
  const offered = normalizeStructuredItems(row.items_offered);
  const requested = normalizeStructuredItems(row.items_requested);
  const structured = buildStructuredOfferSummary(offered, requested, null);
  const fromStructured = structured.trim();
  const fromBody = typeof row.body === "string" ? row.body.trim().replace(/\s+/g, " ") : "";
  const summary_line = (fromStructured || fromBody).slice(0, 280);
  return {
    id: row.id,
    thread_id: row.thread_id,
    status: row.status,
    catalog_card_id: row.catalog_card_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    summary_line: summary_line.length > 0 ? summary_line : "Structured marketplace offer (no summary).",
  };
}
