import { BinderPagesClient } from "@/components/binders/binder-pages-client";
import { BinderPaperBackdrop } from "@/components/artwork/artwork-surfaces";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumb, NavBackLink } from "@/mca-ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

type PageProps = { params: { binderId: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { title: "Binder pages" };
    const { data: binder } = await supabase
      .from("binders")
      .select("name")
      .eq("id", params.binderId)
      .eq("user_id", user.id)
      .maybeSingle();
    return { title: binder?.name ? `Pages · ${binder.name}` : "Binder pages" };
  } catch {
    return { title: "Binder pages" };
  }
}

export default async function BinderPagesPage({ params }: PageProps) {
  const binderId = params.binderId?.trim() ?? "";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl(`/binders/${encodeURIComponent(binderId)}/pages`));
  }
  if (!binderId) notFound();

  const { data: binder } = await supabase
    .from("binders")
    .select("id, name")
    .eq("id", binderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!binder) notFound();

  return (
    <BinderPaperBackdrop>
      <div className="space-y-mca-section">
        <NavBackLink href={`/binders/${binder.id}`}>← {binder.name}</NavBackLink>
        <Breadcrumb
          items={[
            { label: "Binders", href: "/binders" },
            { label: binder.name, href: `/binders/${binder.id}` },
            { label: "Pages" },
          ]}
          className="mt-mca-xs"
        />
        <div className="flex flex-wrap gap-mca-sm">
          <Link
            href={`/binders/${binder.id}`}
            className="text-sm font-medium text-mca-ink-muted hover:text-mca-ink-body"
          >
            Grid view
          </Link>
          <Link
            href={`/binders/${binder.id}/missing`}
            className="text-sm font-medium text-mca-accent-strong/90 hover:text-mca-accent"
          >
            Missing cards
          </Link>
        </div>
        <Suspense
          fallback={
            <p className="text-sm text-mca-ink-muted" role="status">
              Loading binder pages…
            </p>
          }
        >
          <BinderPagesClient binderId={binder.id} binderName={binder.name} />
        </Suspense>
      </div>
    </BinderPaperBackdrop>
  );
}
