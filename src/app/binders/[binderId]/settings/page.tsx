import { BinderPaperBackdrop } from "@/components/artwork/artwork-surfaces";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { parseBinderVisibility } from "@/lib/binders/binder-social-types";
import { logServerError } from "@/lib/server/observability";
import { createClient } from "@/lib/supabase/server";
import { BinderVisibilitySelector } from "@/mca-ui/binder/BinderVisibilitySelector";
import { Breadcrumb, NavBackLink } from "@/mca-ui";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

type PageProps = { params: { binderId: string } };

export const metadata: Metadata = { title: "Binder settings" };

export default async function BinderSettingsPage({ params }: PageProps) {
  const binderId = params.binderId?.trim() ?? "";
  if (!binderId) redirect("/binders");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl(`/binders/${encodeURIComponent(binderId)}/settings`));
  }

  const { data: binder, error } = await supabase
    .from("binders")
    .select("id, name, visibility, user_id")
    .eq("id", binderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    logServerError({
      scope: "ssr",
      route: "/binders/[binderId]/settings",
      userId: user.id,
      err: error,
    });
  }

  if (!binder) redirect("/binders");

  const visibility = parseBinderVisibility(binder.visibility);

  return (
    <BinderPaperBackdrop>
      <div className="space-y-mca-section">
        <NavBackLink href={`/binders/${binderId}`}>← {binder.name}</NavBackLink>
        <Breadcrumb
          items={[
            { label: "Binders", href: "/binders" },
            { label: binder.name, href: `/binders/${binderId}` },
            { label: "Settings" },
          ]}
        />
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-mca-ink">Binder settings</h1>
          <p className="mt-mca-sm text-sm text-mca-ink-muted">
            Control who can view and discover this binder.
          </p>
        </header>
        <BinderVisibilitySelector binderId={binderId} initialVisibility={visibility} />
      </div>
    </BinderPaperBackdrop>
  );
}
