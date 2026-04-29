"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { InvalidLinkCard } from "@/components/auth/invalid-link-card";
import { exchangeVerificationLink, parseVerificationParams } from "@/lib/auth/verification-flow";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const TEL = { componentName: "AuthResetPasswordPage", surfaceName: "auth.reset-password" } as const;

type ResetState = "verifying" | "ready" | "invalid";

export default function AuthResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<ResetState>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyRecoveryLink() {
      const supabase = supabaseBrowser();
      const parsed = parseVerificationParams(searchParams, "recovery");

      // Signed-in users should use account settings instead of recovery pages.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && !parsed.hasParams) {
        router.replace("/profile/edit");
        return;
      }

      if (!parsed.hasParams || !parsed.matchesExpectedType) {
        if (!cancelled) {
          setState("invalid");
          setMessage("Invalid or expired reset link. Request a new one.");
        }
        return;
      }

      try {
        const result = await exchangeVerificationLink(supabase, parsed, "recovery");
        if (!result.ok) throw new Error(result.reason);

        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", window.location.pathname);
        }

        if (!cancelled) {
          setState("ready");
          setMessage(null);
        }
        mcaLog.event("auth.reset_password", { ok: true, reason: "token_verified" }, TEL);
      } catch {
        if (!cancelled) {
          setState("invalid");
          setMessage("Invalid or expired reset link. Request a new one.");
        }
        mcaLog.event("auth.reset_password", { ok: false, reason: "invalid_or_expired_link" }, TEL);
      }
    }

    void verifyRecoveryLink();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSuccess(false);

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(error.message);
        mcaLog.event("auth.reset_password", { ok: false, reason: "update_failed" }, TEL);
        return;
      }

      // Mark completion metadata in case this account started OAuth-only.
      await supabase.auth.updateUser({ data: { password_setup_complete: true } });
      setSuccess(true);
      setMessage("Your password has been updated. Redirecting to sign in...");
      mcaLog.event("auth.reset_password", { ok: true, reason: "password_updated" }, TEL);
      window.setTimeout(() => {
        router.push("/auth/sign-in");
      }, 1000);
    } catch {
      setMessage("Could not update your password. Please try again.");
      mcaLog.event("auth.reset_password", { ok: false, reason: "network_error" }, TEL);
    } finally {
      setLoading(false);
    }
  }

  if (state === "verifying") {
    return (
      <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl text-center text-sm text-mca-ink-subtle shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
        Verifying reset link...
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <InvalidLinkCard
        title="Reset password"
        message={message ?? "Invalid or expired reset link. Request a new one."}
        actions={[
          { href: "/forgot-password", label: "Request new reset link", primary: true },
          { href: "/auth/sign-in", label: "Back to sign in" },
        ]}
      />
    );
  }

  return (
    <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
      <h1 className="text-center text-xl font-semibold text-mca-ink-strong">Set new password</h1>
      <p className="mt-mca-sm text-center text-sm text-mca-ink-muted">
        Choose a new password for your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-mca-lg space-y-mca-base">
        <div>
          <label
            htmlFor="auth-reset-password"
            className="block text-xs font-medium uppercase tracking-wide text-mca-ink-subtle"
          >
            New password
          </label>
          <input
            id="auth-reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || success}
            className="mt-mca-sm w-full rounded-mca-control border border-mca-border-subtle bg-mca-surface px-mca-compact py-mca-tight text-sm text-mca-ink-strong shadow-mca-panel transition-all placeholder:text-mca-ink-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="auth-reset-password-confirm"
            className="block text-xs font-medium uppercase tracking-wide text-mca-ink-subtle"
          >
            Confirm password
          </label>
          <input
            id="auth-reset-password-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading || success}
            className="mt-mca-sm w-full rounded-mca-control border border-mca-border-subtle bg-mca-surface px-mca-compact py-mca-tight text-sm text-mca-ink-strong shadow-mca-panel transition-all placeholder:text-mca-ink-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-60"
          />
        </div>

        {message && (
          <p
            role="status"
            className={
              success
                ? "text-sm text-mca-success-bold dark:text-mca-success"
                : "text-sm text-mca-accent-deep dark:text-mca-accent"
            }
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || success}
          className="w-full rounded-mca-control bg-mca-surface-paper px-mca-base py-mca-tight text-sm font-semibold text-mca-on-accent shadow-mca-panel transition-all duration-200 ease-mca-standard hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
