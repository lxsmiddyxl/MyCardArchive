import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EMPTY_ANALYTICS,
  type AnalyticsResult,
  type RecentScanEntry,
  type TopCardEntry,
} from "@/lib/analytics/types";
import {
  bestPriceUsdFromRows,
  groupPricesByCardId,
  incrMap,
  monthKeyUtc,
  parseSetNameFromScanRaw,
  scanSummaryFromRaw,
  uniqueCardKey,
  type CardPriceRow,
} from "@/lib/analytics/utils";

type CardAnalyticsRow = Pick<
  Database["public"]["Tables"]["cards"]["Row"],
  "id" | "binder_id" | "name" | "number" | "rarity" | "image_url" | "catalog_card_id"
> & {
  catalog_cards:
    | {
        rarity: string | null;
        catalog_sets: { name: string } | null;
      }
    | {
        rarity: string | null;
        catalog_sets: { name: string } | null;
      }[]
    | null;
};

function catalogRarity(c: CardAnalyticsRow): string {
  try {
    const cc = c.catalog_cards;
    const row = Array.isArray(cc) ? cc[0] : cc;
    const r = row?.rarity?.trim();
    if (r) return r;
    return (c.rarity ?? "").trim() || "Unknown";
  } catch {
    return (c.rarity ?? "").trim() || "Unknown";
  }
}

function catalogSetLabel(
  c: CardAnalyticsRow,
  scanFallback: string | undefined
): string {
  try {
    const cc = c.catalog_cards;
    const row = Array.isArray(cc) ? cc[0] : cc;
    const st = row?.catalog_sets;
    const setName =
      st && typeof st === "object" && !Array.isArray(st)
        ? st.name?.trim()
        : undefined;
    if (setName) return setName;
    if (scanFallback) return scanFallback;
    return "Unknown set";
  } catch {
    return scanFallback ?? "Unknown set";
  }
}

function buildSetLabelsFromScans(
  scans: { card_id: string | null; raw_text: string | null }[]
): Map<string, string> {
  const byCard = new Map<string, string>();
  try {
    for (const s of scans) {
      if (!s.card_id) continue;
      if (byCard.has(s.card_id)) continue;
      const setName = parseSetNameFromScanRaw(s.raw_text);
      if (setName) {
        byCard.set(s.card_id, setName);
      }
    }
  } catch {
    /* ignore */
  }
  return byCard;
}

/**
 * Analytics for one binder. Relies on RLS — only the signed-in user’s rows are visible.
 * Never throws; returns safe defaults on error.
 */
export async function getBinderAnalytics(
  client: SupabaseClient<Database>,
  binderId: string
): Promise<AnalyticsResult> {
  try {
    const bid = binderId?.trim();
    if (!bid) {
      return { ...EMPTY_ANALYTICS };
    }

    const { data: cardsRaw, error: cardsErr } = await client
      .from("cards")
      .select(
        "id, binder_id, name, number, rarity, image_url, catalog_card_id, catalog_cards(rarity, catalog_sets(name))"
      )
      .eq("binder_id", bid);

    if (cardsErr || !cardsRaw?.length) {
      return { ...EMPTY_ANALYTICS };
    }

    const cards = cardsRaw as CardAnalyticsRow[];
    const cardIds = cards.map((c) => c.id);

    const [{ data: priceRows, error: priceErr }, { data: scansForSets }, { data: scansForMonth }, { data: scansRecent }] =
      await Promise.all([
        client.from("card_prices").select("*").in("card_id", cardIds),
        client
          .from("scan_events")
          .select("card_id, raw_text, created_at")
          .in("card_id", cardIds)
          .not("card_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(2000),
        client
          .from("scan_events")
          .select("created_at")
          .in("card_id", cardIds)
          .limit(5000),
        client
          .from("scan_events")
          .select("id, card_id, raw_text, created_at")
          .in("card_id", cardIds)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    const prices = (priceErr ? [] : (priceRows ?? [])) as CardPriceRow[];
    const byCardPrice = groupPricesByCardId(prices);

    const rarity_breakdown: Record<string, number> = {};
    const set_breakdown: Record<string, number> = {};
    const uniqueKeys = new Set<string>();
    let total_value = 0;

    const setByCard = buildSetLabelsFromScans(scansForSets ?? []);

    for (const c of cards) {
      uniqueKeys.add(uniqueCardKey(c.name, c.number));
      incrMap(rarity_breakdown, catalogRarity(c), 1);
      const setLabel = catalogSetLabel(c, setByCard.get(c.id));
      incrMap(set_breakdown, setLabel, 1);
      total_value += bestPriceUsdFromRows(byCardPrice.get(c.id) ?? []);
    }

    const monthly_scan_activity: Record<string, number> = {};
    for (const row of scansForMonth ?? []) {
      const mk = monthKeyUtc(row.created_at);
      if (mk) {
        monthly_scan_activity[mk] = (monthly_scan_activity[mk] ?? 0) + 1;
      }
    }

    const top_cards: TopCardEntry[] = cards.map((c) => ({
      card_id: c.id,
      binder_id: c.binder_id,
      name: c.name,
      number: c.number,
      rarity: c.rarity,
      image_url: c.image_url,
      estimated_value_usd: bestPriceUsdFromRows(byCardPrice.get(c.id) ?? []),
    }));
    top_cards.sort((a, b) => {
      const d = b.estimated_value_usd - a.estimated_value_usd;
      if (d !== 0) return d;
      return a.name.localeCompare(b.name);
    });
    const topSlice = top_cards.slice(0, 10);

    const recent_scans: RecentScanEntry[] = (scansRecent ?? []).map((s) => ({
      id: s.id,
      created_at: s.created_at,
      card_id: s.card_id,
      summary: scanSummaryFromRaw(s.raw_text),
    }));

    return {
      summary: {
        card_count: cards.length,
        unique_cards: uniqueKeys.size,
        total_value: Math.round(total_value * 100) / 100,
      },
      rarity_breakdown,
      set_breakdown,
      top_cards: topSlice,
      recent_scans,
      monthly_scan_activity,
    };
  } catch {
    return { ...EMPTY_ANALYTICS };
  }
}
