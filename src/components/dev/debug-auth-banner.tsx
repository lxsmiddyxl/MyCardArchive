"use client";

import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function DebugAuthBanner() {
  const [info, setInfo] = useState<{
    email: string | null;
    id: string | null;
    profileExists: boolean | null;
  }>({
    email: null,
    id: null,
    profileExists: null,
  });
  const [repairing, setRepairing] = useState(false);

  const load = useCallback(async () => {
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setInfo({ email: null, id: null, profileExists: false });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    setInfo({
      email: user.email ?? null,
      id: user.id,
      profileExists: !!profile,
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const repair = useCallback(async () => {
    setRepairing(true);
    try {
      const r = await fetchJson<Record<string, unknown>>("/api/dev/repair-profile", {
        method: "POST",
      });
      if (r.kind !== "ok") {
        console.error("repair-profile failed", fetchJsonErrorMessage(r));
      }
      await load();
    } finally {
      setRepairing(false);
    }
  }, [load]);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="z-[9999] border-b border-mca-success/50 bg-mca-surface px-mca-sm py-mca-xs font-mono text-mca-caption text-mca-success">
      <div className="font-semibold text-mca-success">DEV AUTH DEBUG</div>
      <div>User Email: {info.email ?? "null"}</div>
      <div>User ID: {info.id ?? "null"}</div>
      <div>Profile Exists: {String(info.profileExists)}</div>
      <div className="mt-mca-xs">
        <button
          type="button"
          onClick={() => void repair()}
          disabled={repairing}
          className="rounded-mca-control border border-mca-success/50 bg-mca-chrome/80 px-mca-sm py-mca-trace text-mca-caption text-mca-success transition-colors duration-200 ease-mca-standard hover:bg-mca-chrome disabled:cursor-wait"
        >
          {repairing ? "Repairing…" : "Repair Profile Now"}
        </button>
      </div>
    </div>
  );
}
