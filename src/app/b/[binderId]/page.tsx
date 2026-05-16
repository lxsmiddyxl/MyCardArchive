import { BinderPaperBackdrop } from "@/components/artwork/artwork-surfaces";
import { PublicBinderSlots } from "@/components/binders/public-binder-slots";
import { loadPublicBinder } from "@/lib/public-binder/load-public-binder";
import { tryCreateAnonServerClient } from "@/lib/supabase/anon-server";
import { createClient } from "@/lib/supabase/server";
import { PublicBinderPage } from "@/mca-ui/binder/PublicBinderPage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 120;

type PageProps = { params: { binderId: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const binderId = params.binderId?.trim() ?? "";
  const loaded = await loadPublicBinder(binderId);
  if (!loaded.ok) return { title: "Binder" };
  return {
    title: `${loaded.data.binder.name} · Binder`,
    description: loaded.data.binder.description ?? undefined,
  };
}

export default async function PublicBinderRoute({ params }: PageProps) {
  const binderId = params.binderId?.trim() ?? "";
  if (!binderId) notFound();

  const loaded = await loadPublicBinder(binderId);
  if (!loaded.ok) {
    if (loaded.status === 403) notFound();
    notFound();
  }

  const { data } = loaded;
  const anon = tryCreateAnonServerClient();
  const client = anon ?? createClient();

  const {
    data: { user },
  } = await createClient().auth.getUser();

  const { data: slotRows } = await client
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
    <BinderPaperBackdrop>
      <div className="space-y-mca-section py-mca-lg">
        <PublicBinderPage
          binderId={data.binder.id}
          name={data.binder.name}
          description={data.binder.description}
          visibility={data.binder.visibility}
          ownerDisplay={data.owner_display}
          ownerHandle={data.owner_handle}
          insights={data.insights}
          canInteract={Boolean(user)}
        />
        <section aria-labelledby="public-binder-preview">
          <h2
            id="public-binder-preview"
            className="mb-mca-base text-xs font-medium uppercase tracking-[0.2em] text-mca-ink-subtle"
          >
            Page preview
          </h2>
          <PublicBinderSlots page={0} slots={previewSlots} />
        </section>
      </div>
    </BinderPaperBackdrop>
  );
}
