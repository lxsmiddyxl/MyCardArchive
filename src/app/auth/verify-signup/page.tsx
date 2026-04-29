"use client";

import { InvalidLinkCard } from "@/components/auth/invalid-link-card";
import { exchangeVerificationLink, parseVerificationParams } from "@/lib/auth/verification-flow";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const TEL = { componentName: "VerifySignupPage", surfaceName: "auth.verify-signup" } as const;

export default function VerifySignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"verifying" | "invalid" | "success">("verifying");
  const [message, setMessage] = useState("Verifying account confirmation...");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = supabaseBrowser();
      const parsed = parseVerificationParams(searchParams, "signup");
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && !parsed.hasParams) {
          router.replace("/feed");
          return;
        }

        if (!parsed.hasParams || !parsed.matchesExpectedType) {
          if (!cancelled) setState("invalid");
          mcaLog.event("auth.confirm_signup", { ok: false, reason: "invalid_params" }, TEL);
          return;
        }

        const result = await exchangeVerificationLink(supabase, parsed, "signup");
        if (!result.ok) {
          if (!cancelled) setState("invalid");
          mcaLog.event("auth.confirm_signup", { ok: false, reason: "verify_failed" }, TEL);
          return;
        }

        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", window.location.pathname);
        }

        if (!cancelled) {
          setState("success");
          setMessage("Account confirmed. Redirecting to sign in...");
        }
        mcaLog.event("auth.confirm_signup", { ok: true, reason: "verified" }, TEL);
        window.setTimeout(() => router.push("/auth/sign-in?verified=1"), 900);
      } catch {
        if (!cancelled) setState("invalid");
        mcaLog.event("auth.confirm_signup", { ok: false, reason: "verify_network_error" }, TEL);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (state === "invalid") {
    return (
      <InvalidLinkCard
        title="Verify signup"
        message="Invalid or expired link. Request a new one."
        actions={[
          { href: "/auth/confirm-signup", label: "Request a new link", primary: true },
          { href: "/auth/sign-in", label: "Back to sign in" },
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
