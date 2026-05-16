import { BinderSlotPageClient } from "@/components/binders/binder-slot-page-client";
import { BinderPaperBackdrop } from "@/components/artwork/artwork-surfaces";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import type { BinderSlotDTO } from "@/lib/dto/binder";
import { createClient } from "@/lib/supabase/server";
import { parseSlotCoordKey, isBinderSlotUuid } from "@/mca-utils/binders/dragAndDrop";
import { NavBackLink } from "@/mca-ui";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type PageProps = { params: { binderId: string; slotId: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: "Binder slot" };
}

export default async function BinderSlotPage({ params }: PageProps) {
  const binderId = params.binderId?.trim() ?? "";
  const slotKey = params.slotId?.trim() ?? "";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      authSignInUrl(
        `/binders/${encodeURIComponent(binderId)}/slot/${encodeURIComponent(slotKey)}`
      )
    );
  }
  if (!binderId || !slotKey) notFound();

  const { data: binder } = await supabase
    .from("binders")
    .select("id, name")
    .eq("id", binderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!binder) notFound();

  let page = 0;
  let slotIndex = 0;
  let slotRow: BinderSlotDTO | null = null;

  if (isBinderSlotUuid(slotKey)) {
    slotRow = normalizeSlotRow(await loadSlotById(supabase, binderId, slotKey));
    if (slotRow) {
      page = slotRow.page_number;
      slotIndex = slotRow.slot_index;
    }
  } else {
    const coord = parseSlotCoordKey(slotKey);
    if (!coord) notFound();
    page = coord.page;
    slotIndex = coord.slot;
    const { data } = await supabase
      .from("binder_slots")
      .select(
        `
        id,
        binder_id,
        page_number,
        slot_index,
        card_id,
        created_at,
        cards (
          id,
          name,
          image_url,
          rarity,
          number,
          binder_id
        )
      `
      )
      .eq("binder_id", binderId)
      .eq("page_number", page)
      .eq("slot_index", slotIndex)
      .maybeSingle();
    slotRow = normalizeSlotRow(data);
  }

  return (
    <BinderPaperBackdrop>
      <div className="space-y-mca-section">
        <NavBackLink href={`/binders/${binder.id}/pages?page=${page}`}>
          ← Pages
        </NavBackLink>
        <BinderSlotPageClient
          binderId={binder.id}
          binderName={binder.name}
          slot={slotRow}
          page={page}
          slotIndex={slotIndex}
        />
      </div>
    </BinderPaperBackdrop>
  );
}

function normalizeSlotRow(row: unknown): BinderSlotDTO | null {
  if (!row || typeof row !== "object") return null;
  const r = row as BinderSlotDTO & {
    cards?: BinderSlotDTO["card"] | BinderSlotDTO["card"][];
  };
  const cardRaw = r.cards;
  const card = Array.isArray(cardRaw) ? (cardRaw[0] ?? null) : (cardRaw ?? r.card ?? null);
  return { ...r, card };
}

async function loadSlotById(
  supabase: ReturnType<typeof createClient>,
  binderId: string,
  slotId: string
) {
  const { data } = await supabase
    .from("binder_slots")
    .select(
      `
      id,
      binder_id,
      page_number,
      slot_index,
      card_id,
      created_at,
      cards (
        id,
        name,
        image_url,
        rarity,
        number,
        binder_id
      )
    `
    )
    .eq("binder_id", binderId)
    .eq("id", slotId)
    .maybeSingle();
  return data;
}
