import { BinderCreationWizard } from "@/mca-ui/binder/BinderCreationWizard";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "New binder",
};

export default async function NewBinderPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(authSignInUrl("/binders/new"));
  }

  return (
    <div className="mx-auto max-w-lg space-y-mca-xl py-mca-lg">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong">Create binder</h1>
        <p className="mt-mca-sm text-sm text-mca-ink-muted">
          Name your binder, pick a type, and preview your shelf accent.
        </p>
      </header>
      <BinderCreationWizard />
    </div>
  );
}
