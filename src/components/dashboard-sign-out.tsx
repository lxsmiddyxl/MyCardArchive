"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DashboardSignOut() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="rounded-mca-control border border-mca-border-subtle bg-mca-surface-elevated/80 px-mca-compact py-mca-sm text-sm font-medium text-mca-ink-body transition-all duration-200 ease-mca-standard hover:border-mca-field-border hover:bg-mca-chrome/60 hover:text-mca-ink-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
