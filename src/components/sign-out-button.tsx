"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/auth/sign-in");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-mca-block border border-mca-border-light-strong bg-white px-mca-compact py-mca-micro text-sm font-medium text-mca-chrome shadow-mca-panel transition hover:bg-mca-surface-light dark:border-mca-field-border dark:bg-mca-surface-elevated dark:text-mca-ink-strong dark:hover:bg-mca-chrome"
    >
      Sign out
    </button>
  );
}
