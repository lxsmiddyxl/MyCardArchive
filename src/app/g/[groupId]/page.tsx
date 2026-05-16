import { BinderGroupPage } from "@/mca-ui/binder/BinderGroupPage";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAnonServerClient } from "@/lib/supabase/anon-server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = { params: { groupId: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const groupId = params.groupId?.trim() ?? "";
  const client = tryCreateAnonServerClient() ?? createClient();
  const { data } = await client
    .from("binder_groups")
    .select("title")
    .eq("id", groupId)
    .maybeSingle();
  return { title: data?.title ? `${data.title} · Binder group` : "Binder group" };
}

export default async function PublicBinderGroupRoute({ params }: PageProps) {
  const groupId = params.groupId?.trim() ?? "";
  if (!groupId) notFound();

  const client = tryCreateAnonServerClient() ?? createClient();

  const { data: group } = await client
    .from("binder_groups")
    .select("id, user_id, title, description, cover_url")
    .eq("id", groupId)
    .maybeSingle();

  if (!group) notFound();

  const { data: items } = await client
    .from("binder_group_items")
    .select("binder_id, position, binders ( id, name, visibility )")
    .eq("group_id", groupId)
    .order("position", { ascending: true });

  const binders = (items ?? [])
    .map((row) => {
      const b = row.binders as { id: string; name: string; visibility: string } | null;
      if (!b || (b.visibility !== "public" && b.visibility !== "unlisted")) return null;
      return { id: b.id, name: b.name, share_url: `/b/${b.id}` };
    })
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  if (!binders.length) notFound();

  const { data: profile } = await client
    .from("profiles")
    .select("display_name, handle, username")
    .eq("id", group.user_id)
    .maybeSingle();

  const ownerDisplay =
    profile?.display_name?.trim() || profile?.username?.trim() || "Collector";
  const ownerHandle = profile?.handle?.trim() ?? null;

  return (
    <div className="py-mca-lg">
      <BinderGroupPage
        title={group.title}
        description={group.description}
        coverUrl={group.cover_url}
        ownerDisplay={ownerDisplay}
        ownerHandle={ownerHandle}
        binders={binders}
      />
    </div>
  );
}
