import type { TradeReputationCounts } from "@/lib/trade/trade-reputation-helpers";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadSocialTradeReputationByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, TradeReputationCounts>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const { data, error } = await supabase.rpc("get_users_trade_reputation_batch", {
      p_user_ids: unique,
    });
    if (error || !Array.isArray(data)) return {};
    const out: Record<string, TradeReputationCounts> = {};
    for (const raw of data as Record<string, unknown>[]) {
      const uid = raw.user_id != null ? String(raw.user_id) : "";
      if (!uid) continue;
      out[uid] = {
        completedTradesCount: Number(raw.completed_trades_count ?? 0),
        positiveFeedbackCount: Number(raw.positive_feedback_count ?? 0),
        neutralFeedbackCount: Number(raw.neutral_feedback_count ?? 0),
        negativeFeedbackCount: Number(raw.negative_feedback_count ?? 0),
        lastTradeAt: raw.last_trade_at != null ? String(raw.last_trade_at) : null,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export async function loadUserTradeReputationRpc(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<TradeReputationCounts | null> {
  const uid = userId.trim();
  if (!uid) return null;
  try {
    const { data, error } = await supabase.rpc("get_user_trade_reputation", { p_user_id: uid });
    if (error || !Array.isArray(data) || data.length === 0) return null;
    const row = data[0] as Record<string, unknown>;
    return {
      completedTradesCount: Number(row.completed_trades_count ?? 0),
      positiveFeedbackCount: Number(row.positive_feedback_count ?? 0),
      neutralFeedbackCount: Number(row.neutral_feedback_count ?? 0),
      negativeFeedbackCount: Number(row.negative_feedback_count ?? 0),
      lastTradeAt: row.last_trade_at != null ? String(row.last_trade_at) : null,
    };
  } catch {
    return null;
  }
}
