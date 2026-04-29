"use client";

import { InvalidLinkCard } from "@/components/auth/invalid-link-card";
import { exchangeVerificationLink, parseVerificationParams } from "@/lib/auth/verification-flow";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const TEL = { componentName: "VerifyEmailChangePage", surfaceName: "auth.verify-email-change" } as const;

export default function VerifyEmailChangePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"verifying" | "invalid" | "success">("verifying");
  const [message, setMessage] = useState("Verifying email-change link...");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = supabaseBrowser();
      const parsed = parseVerificationParams(searchParams, "email_change");
      try {
        if (!parsed.hasParams || !parsed.matchesExpectedType) {
          if (!cancelled) setState("invalid");
          mcaLog.event("auth.email_change", { ok: false, reason: "invalid_params" }, TEL);
          return;
        }

        const result = await exchangeVerificationLink(supabase, parsed, "email_change");
        if (!result.ok) {
          if (!cancelled) setState("invalid");
          mcaLog.event("auth.email_change", { ok: false, reason: "verify_failed" }, TEL);
          return;
        }

        // Defensive cleanup: ensure pending email-change metadata is removed.
        await supabase.auth.updateUser({
          data: {
            email_change: null,
            email_change_sent_at: null,
          },
        });

        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", window.location.pathname);
        }

        if (!cancelled) {
          setState("success");
          setMessage("Email confirmed. Redirecting to settings...");
        }
        mcaLog.event("auth.email_change", { ok: true, reason: "verified" }, TEL);
        window.setTimeout(() => router.push("/profile/edit"), 900);
      } catch {
        if (!cancelled) setState("invalid");
        mcaLog.event("auth.email_change", { ok: false, reason: "verify_network_error" }, TEL);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (state === "invalid") {
    return (
      <InvalidLinkCard
        title="Verify email change"
        message="Invalid or expired link. Request a new one."
        actions={[
          { href: "/auth/confirm-email-change", label: "Request a new link", primary: true },
          { href: "/profile/edit", label: "Back to profile settings" },
        ]}
      />
    );
  }

  return (
    <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl text-center text-sm text-mca-ink-subtle shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
      {message}
    </div>
  );
}
