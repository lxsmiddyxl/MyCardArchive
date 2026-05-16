import { loadPublicBinder } from "@/lib/public-binder/load-public-binder";
import { tryCreateAnonServerClient } from "@/lib/supabase/anon-server";
import { BinderEmbed } from "@/mca-ui/marketing/BinderEmbed";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 120;

type PageProps = { params: { binderId: string } };

export const metadata: Metadata = {
  title: "Binder embed",
  robots: { index: false, follow: false },
};

export default async function BinderEmbedPage({ params }: PageProps) {
  const binderId = params.binderId?.trim() ?? "";
  if (!binderId) notFound();

  const loaded = await loadPublicBinder(binderId);
  if (!loaded.ok) notFound();

  const { data } = loaded;
  const anon = tryCreateAnonServerClient();
  if (!anon) notFound();

  const { data: slotRows } = await anon
    .from("binder_slots")
    .select(
      `
      slot_index,
      page_number,
      card_id,
      cards ( id, name, image_url )
    `
    )
    .eq("binder_id", binderId)
    .eq("page_number", 0)
    .order("slot_index", { ascending: true });

  const previewSlots = (slotRows ?? []).map((row) => {
    const card = row.cards as { id: string; name: string; image_url: string | null } | null;
    return {
      slot_index: row.slot_index,
      card_id: row.card_id,
      name: card?.name ?? null,
      image_url: card?.image_url ?? null,
    };
  });

  return (
    <BinderEmbed
      binderId={data.binder.id}
      name={data.binder.name}
      description={data.binder.description}
      ownerDisplay={data.owner_display}
      insights={data.insights}
      previewSlots={previewSlots}
    />
  );
}
