import type { FandomIdentityFields } from "@/lib/fandom/fandom-identity-helpers";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function strOrNull(x: unknown): string | null {
  const s = x != null ? String(x).trim() : "";
  return s.length > 0 ? s : null;
}

function identityFromRaw(raw: Record<string, unknown>): FandomIdentityFields {
  return {
    favoriteSetId: strOrNull(raw.favorite_set_id),
    favoriteEraId: strOrNull(raw.favorite_era_id),
    favoriteArtistId: strOrNull(raw.favorite_artist_id),
    favoriteCharacterId: strOrNull(raw.favorite_character_id),
    favoriteThemeId: strOrNull(raw.favorite_theme_id),
  };
}

export async function loadSocialFandomIdentityByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, FandomIdentityFields>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) return {};
  const empty = (): FandomIdentityFields => ({
    favoriteSetId: null,
    favoriteEraId: null,
    favoriteArtistId: null,
    favoriteCharacterId: null,
    favoriteThemeId: null,
  });

  try {
    const { data, error } = await supabase.rpc("get_users_fandom_identity_batch", {
      p_user_ids: unique,
    });
    const out: Record<string, FandomIdentityFields> = {};
    for (const uid of unique) out[uid] = empty();
    if (error || !Array.isArray(data)) return out;
    for (const row of data as Record<string, unknown>[]) {
      const uid = row.user_id != null ? String(row.user_id) : "";
      if (!uid || !out[uid]) continue;
      out[uid] = identityFromRaw(row);
    }
    return out;
  } catch {
    return Object.fromEntries(unique.map((uid) => [uid, empty()]));
  }
}
