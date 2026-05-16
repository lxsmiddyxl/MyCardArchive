import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { ScanRankingResult } from "@/lib/scanning/phase3/types";

export async function insertScanHistory(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    imageUrl: string | null;
    bestCatalogCardId: string | null;
    confidence: number;
    scanEventId?: string | null;
  }
): Promise<string | null> {
  const { data, error } = await supabase
    .from("scan_history")
    .insert({
      user_id: input.userId,
      image_url: input.imageUrl,
      best_catalog_card_id: input.bestCatalogCardId,
      confidence: input.confidence,
      scan_event_id: input.scanEventId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return data.id;
}

export function historyImageFromRanking(ranking: ScanRankingResult): string | null {
  return ranking.topCandidate?.image_url?.trim() ?? null;
}
