import { BinderCollectionsPanel } from "@/mca-ui/binder/BinderCollectionsPanel";
import { BinderGroupEditor } from "@/mca-ui/binder/BinderGroupEditor";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Binder collections" };

export default async function BinderCollectionsRoute() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(authSignInUrl("/binders/collections"));

  return (
    <div className="space-y-mca-section py-mca-lg">
      <header>
        <h1 className="text-2xl font-semibold text-mca-ink">Binder portfolio</h1>
        <p className="mt-mca-sm text-sm text-mca-ink-muted">
          Organize binders into collections and themed groups.
        </p>
      </header>
      <BinderCollectionsPanel />
      <BinderGroupEditor />
    </div>
  );
}
