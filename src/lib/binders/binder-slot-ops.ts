import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BinderSlotRef } from "@/mca-utils/binders/dragAndDrop";
import type { LayoutAssignment } from "@/mca-utils/binders/autoLayout";

export function normalizeSlotRef(raw: unknown): BinderSlotRef | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const page =
    typeof o.page === "number" && Number.isFinite(o.page)
      ? Math.max(0, Math.floor(o.page))
      : NaN;
  const slot =
    typeof o.slot === "number" && Number.isFinite(o.slot)
      ? Math.floor(o.slot)
      : NaN;
  if (!Number.isFinite(page) || !Number.isFinite(slot)) return null;
  if (slot < 0 || slot > 23) return null;
  return { page, slot };
}

export async function swapBinderSlots(
  supabase: SupabaseClient<Database>,
  binderId: string,
  from: BinderSlotRef,
  to: BinderSlotRef
): Promise<{ ok: true } | { ok: false; message: string }> {
  async function readCardId(page: number, slot: number): Promise<string | null> {
    const { data } = await supabase
      .from("binder_slots")
      .select("card_id")
      .eq("binder_id", binderId)
      .eq("page_number", page)
      .eq("slot_index", slot)
      .maybeSingle();
    return data?.card_id ?? null;
  }

  const fromCard = await readCardId(from.page, from.slot);
  const toCard = await readCardId(to.page, to.slot);

  const { error } = await supabase.from("binder_slots").upsert(
    [
      {
        binder_id: binderId,
        page_number: from.page,
        slot_index: from.slot,
        card_id: toCard,
      },
      {
        binder_id: binderId,
        page_number: to.page,
        slot_index: to.slot,
        card_id: fromCard,
      },
    ],
    { onConflict: "binder_id,page_number,slot_index" }
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function assignCardToSlot(
  supabase: SupabaseClient<Database>,
  binderId: string,
  userId: string,
  ref: BinderSlotRef,
  cardId: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (cardId) {
    const { data: card, error: cErr } = await supabase
      .from("cards")
      .select("id, binder_id")
      .eq("id", cardId)
      .eq("user_id", userId)
      .maybeSingle();
    if (cErr) return { ok: false, message: cErr.message };
    if (!card || card.binder_id !== binderId) {
      return { ok: false, message: "Card must belong to this binder" };
    }
  }

  const { error } = await supabase.from("binder_slots").upsert(
    {
      binder_id: binderId,
      page_number: ref.page,
      slot_index: ref.slot,
      card_id: cardId,
    },
    { onConflict: "binder_id,page_number,slot_index" }
  );

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function copyCardToSlot(
  supabase: SupabaseClient<Database>,
  binderId: string,
  userId: string,
  sourceCardId: string,
  to: BinderSlotRef
): Promise<{ ok: true; card_id: string } | { ok: false; message: string }> {
  const { data: source, error: sErr } = await supabase
    .from("cards")
    .select("id, name, number, rarity, image_url, catalog_card_id")
    .eq("id", sourceCardId)
    .eq("user_id", userId)
    .eq("binder_id", binderId)
    .maybeSingle();

  if (sErr) return { ok: false, message: sErr.message };
  if (!source) return { ok: false, message: "Source card not found" };

  const { data: inserted, error: iErr } = await supabase
    .from("cards")
    .insert({
      binder_id: binderId,
      user_id: userId,
      name: source.name,
      number: source.number,
      rarity: source.rarity,
      image_url: source.image_url,
      ...(source.catalog_card_id ? { catalog_card_id: source.catalog_card_id } : {}),
    })
    .select("id")
    .single();

  if (iErr || !inserted) {
    return { ok: false, message: iErr?.message ?? "Copy failed" };
  }

  const assigned = await assignCardToSlot(supabase, binderId, userId, to, inserted.id);
  if (!assigned.ok) {
    await supabase.from("cards").delete().eq("id", inserted.id).eq("user_id", userId);
    return assigned;
  }

  return { ok: true, card_id: inserted.id };
}

export async function applyLayoutAssignments(
  supabase: SupabaseClient<Database>,
  binderId: string,
  assignments: LayoutAssignment[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (assignments.length === 0) return { ok: true };

  const rows = assignments.map((a) => ({
    binder_id: binderId,
    page_number: a.page,
    slot_index: a.slot,
    card_id: a.card_id,
  }));

  const { error } = await supabase.from("binder_slots").upsert(rows, {
    onConflict: "binder_id,page_number,slot_index",
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
