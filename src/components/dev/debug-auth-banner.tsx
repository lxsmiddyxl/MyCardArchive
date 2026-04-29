"use client";

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
      const res = await fetch("/api/dev/repair-profile", { method: "POST" });
      if (!res.ok) {
        console.error("repair-profile failed", await res.text());
      }
      await load();
    } finally {
      setRepairing(false);
    }
  }, [load]);

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div
      style={{
        background: "#111",
        color: "#0f0",
        padding: "8px 12px",
        fontSize: "12px",
        fontFamily: "monospace",
        borderBottom: "1px solid #0f0",
        zIndex: 9999,
      }}
    >
      <div>DEV AUTH DEBUG</div>
      <div>User Email: {info.email ?? "null"}</div>
      <div>User ID: {info.id ?? "null"}</div>
      <div>Profile Exists: {String(info.profileExists)}</div>
      <div style={{ marginTop: 6 }}>
        <button
          type="button"
          onClick={() => void repair()}
          disabled={repairing}
          style={{
            fontSize: "11px",
            padding: "4px 8px",
            cursor: repairing ? "wait" : "pointer",
            background: "#222",
            color: "#0f0",
            border: "1px solid #0f0",
          }}
        >
          {repairing ? "Repairing…" : "Repair Profile Now"}
        </button>
      </div>
    </div>
  );
}
