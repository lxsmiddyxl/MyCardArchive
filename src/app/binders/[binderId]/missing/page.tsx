import { BinderMissingClient } from "@/components/binders/binder-missing-client";
import { BinderPaperBackdrop } from "@/components/artwork/artwork-surfaces";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumb, NavBackLink } from "@/mca-ui";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: { binderId: string };
  searchParams: Record<string, string | string[] | undefined>;
};

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return { title: "Missing cards" };

    const { data: binder } = await supabase
      .from("binders")
      .select("name")
      .eq("id", params.binderId)
      .eq("user_id", user.id)
      .maybeSingle();

    return {
      title: binder?.name ? `Missing cards · ${binder.name}` : "Missing cards",
    };
  } catch {
    return { title: "Missing cards" };
  }
}

export default async function BinderMissingPage({ params, searchParams }: PageProps) {
  const binderId = params.binderId?.trim() ?? "";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl(`/binders/${encodeURIComponent(binderId)}/missing`));
  }

  if (!binderId) notFound();

  const { data: binder } = await supabase
    .from("binders")
    .select("id, name")
    .eq("id", binderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!binder) notFound();

  const setId = firstParam(searchParams.setId) ?? firstParam(searchParams.set_id) ?? "";

  return (
    <BinderPaperBackdrop>
      <div className="space-y-mca-section">
        <NavBackLink href={`/binders/${binder.id}`}>← {binder.name}</NavBackLink>
        <Breadcrumb
          items={[
            { label: "Binders", href: "/binders" },
            { label: binder.name, href: `/binders/${binder.id}` },
            { label: "Missing cards" },
          ]}
          className="mt-mca-xs"
        />
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-mca-ink-strong sm:text-3xl">
            Missing cards
          </h1>
          <p className="mt-mca-sm max-w-2xl text-sm text-mca-ink-muted">
            Catalog cards from sets in this binder that you have not added yet.
          </p>
        </header>
        <BinderMissingClient binderId={binder.id} initialSetId={setId} />
      </div>
    </BinderPaperBackdrop>
  );
}
