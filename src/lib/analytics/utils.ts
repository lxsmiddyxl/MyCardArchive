import { amountInUsd, normalizePriceData } from "@/lib/pricing/normalize-price";
import type { Database } from "@/lib/supabase/types";
import type { PriceData } from "@/lib/types/database";

export type CardPriceRow = Database["public"]["Tables"]["card_prices"]["Row"];

export function uniqueCardKey(name: string, number: string | null): string {
  const n = (name ?? "").trim().toLowerCase();
  const num = (number ?? "").trim().toLowerCase();
  return `${n}|${num}`;
}

export function parseSetNameFromScanRaw(raw: string | null): string | null {
  try {
    if (!raw || typeof raw !== "string") return null;
    const j = JSON.parse(raw) as {
      auto_match?: { best_match?: { set_name?: string } };
    };
    const s = j?.auto_match?.best_match?.set_name;
    if (typeof s === "string" && s.trim()) return s.trim();
    return null;
  } catch {
    return null;
  }
}

export function scanSummaryFromRaw(raw: string | null): string | null {
  try {
    if (!raw || typeof raw !== "string") return null;
    const j = JSON.parse(raw) as { normalized?: { name?: string } };
    const n = j?.normalized?.name;
    if (typeof n === "string" && n.trim()) return n.trim();
    return raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
  } catch {
    if (!raw) return null;
    return raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
  }
}

export function monthKeyUtc(iso: string): string | null {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  } catch {
    return null;
  }
}

export function bestPriceUsdFromRows(rows: CardPriceRow[]): number {
  try {
    if (!Array.isArray(rows) || rows.length === 0) return 0;
    const list: PriceData[] = rows.map((r) => ({
      provider: r.provider,
      market_price: r.market_price != null ? Number(r.market_price) : null,
      currency: r.currency,
      raw: (r.raw_json as Record<string, unknown>) ?? {},
    }));
    const n = normalizePriceData(list);
    if (n.best_price == null || !Number.isFinite(Number(n.best_price))) {
      return 0;
    }
    return amountInUsd(Number(n.best_price), n.currency);
  } catch {
    return 0;
  }
}

export function groupPricesByCardId(
  rows: CardPriceRow[]
): Map<string, CardPriceRow[]> {
  const m = new Map<string, CardPriceRow[]>();
  try {
    for (const r of rows) {
      if (!r?.card_id) continue;
      const arr = m.get(r.card_id) ?? [];
      arr.push(r);
      m.set(r.card_id, arr);
    }
  } catch {
    /* ignore */
  }
  return m;
}

export function incrMap(
  map: Record<string, number>,
  key: string,
  delta = 1
): void {
  const k = key.trim() || "Unknown";
  map[k] = (map[k] ?? 0) + delta;
}
