import type { BinderInsights } from "@/mca-utils/binders/binder-insights-types";
import { getBinderInsights } from "@/mca-utils/binders/getBinderInsights";
import { parseBinderVisibility, type BinderVisibility } from "@/lib/binders/binder-social-types";
import { tryCreateAnonServerClient } from "@/lib/supabase/anon-server";
import { createClient } from "@/lib/supabase/server";

export type PublicBinderPayload = {
  binder: {
    id: string;
    name: string;
    description: string | null;
    visibility: BinderVisibility;
    created_at: string;
    user_id: string;
  };
  owner_display: string;
  owner_handle: string | null;
  owner_user_id: string;
  insights: BinderInsights | null;
};

type GatePayload = { status: string; visibility?: string };

export async function loadPublicBinder(
  binderId: string
): Promise<{ ok: true; data: PublicBinderPayload } | { ok: false; status: 404 | 403 }> {
  const anon = tryCreateAnonServerClient();
  const client = anon ?? createClient();

  const { data: gateRaw, error: gateErr } = await client.rpc("get_public_binder_gate", {
    p_binder_id: binderId,
  });

  if (gateErr) {
    return { ok: false, status: 403 };
  }

  const gate = gateRaw as GatePayload | null;
  if (!gate || gate.status === "not_found") return { ok: false, status: 404 };
  if (gate.status === "forbidden") return { ok: false, status: 403 };

  const { data: binder, error: bErr } = await client
    .from("binders")
    .select("id, name, description, visibility, created_at, user_id")
    .eq("id", binderId)
    .maybeSingle();

  if (bErr || !binder) return { ok: false, status: 404 };

  const { data: ownerDisplay } = await client.rpc("get_public_binder_owner_display", {
    p_binder_id: binderId,
  });

  let ownerHandle: string | null = null;
  const { data: profile } = await client
    .from("profiles")
    .select("handle")
    .eq("id", binder.user_id)
    .maybeSingle();
  if (profile?.handle?.trim()) ownerHandle = profile.handle.trim();

  const insights = await getBinderInsights(client, binderId, binder.user_id);

  return {
    ok: true,
    data: {
      binder: {
        id: binder.id,
        name: binder.name,
        description: binder.description,
        visibility: parseBinderVisibility(binder.visibility),
        created_at: binder.created_at,
        user_id: binder.user_id,
      },
      owner_display: typeof ownerDisplay === "string" ? ownerDisplay : "Collector",
      owner_handle: ownerHandle,
      owner_user_id: binder.user_id,
      insights,
    },
  };
}

