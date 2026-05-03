"use client";

import { isPasswordMissingForUser } from "@/lib/auth/password-status";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { supabaseBrowser } from "@/lib/supabase/browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const TEL = { componentName: "SetPasswordPage", surfaceName: "auth.set-password" } as const;

export default function SetPasswordPage() {
  const router = useRouter();
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [variant, setVariant] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = supabaseBrowser();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) {
          router.replace("/auth/sign-in?next=/auth/set-password");
          return;
        }
        if (!isPasswordMissingForUser(user)) {
          router.replace("/feed");
          return;
        }
      } catch {
        if (!cancelled) {
          setVariant("error");
          setMessage("Could not verify account state. Please refresh and try again.");
        }
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setVariant("idle");

    if (password.length < 8) {
      setVariant("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setVariant("error");
      setMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.updateUser({
        password,
        data: { password_setup_complete: true },
      });
      if (error) {
        setVariant("error");
        setMessage(error.message);
        mcaLog.event("auth.set_password", { ok: false, reason: "update_failed", error: error.message }, TEL);
        return;
      }
      setVariant("success");
      setMessage("Password saved. Redirecting to your feed...");
      mcaLog.event("auth.set_password", { ok: true, reason: "password_set" }, TEL);
      router.refresh();
      window.setTimeout(() => {
        router.push("/feed");
      }, 900);
    } catch {
      setVariant("error");
      setMessage("Could not set password. Please try again.");
      mcaLog.event("auth.set_password", { ok: false, reason: "network_error" }, TEL);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingSession) {
    return (
      <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl text-center text-sm text-mca-ink-subtle dark:border-mca-border-subtle">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
      <h1 className="text-center text-xl font-semibold text-mca-ink-strong">Set your password</h1>
      <p className="mt-mca-sm text-center text-sm text-mca-ink-muted">
        You signed up with OAuth. Set a password now so password recovery always works for your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-mca-lg space-y-mca-base">
        <div>
          <label
            htmlFor="set-password"
            className="block text-xs font-medium uppercase tracking-wide text-mca-ink-subtle"
          >
            New password
          </label>
          <input
            id="set-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            className="mca-input mt-mca-sm"
          />
        </div>

        <div>
          <label
            htmlFor="set-password-confirm"
            className="block text-xs font-medium uppercase tracking-wide text-mca-ink-subtle"
          >
            Confirm password
          </label>
          <input
            id="set-password-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={submitting}
            className="mca-input mt-mca-sm"
          />
        </div>

        {message ? (
          <p
            role="status"
            className={
              variant === "success"
                ? "text-sm text-mca-success-bold dark:text-mca-success"
                : "text-sm text-mca-accent-deep dark:text-mca-accent"
            }
          >
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-mca-control bg-mca-surface-paper px-mca-base py-mca-tight text-sm font-semibold text-mca-on-accent shadow-mca-panel transition-all duration-200 ease-mca-standard hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save password"}
        </button>
      </form>

      <p className="mt-mca-lg text-center text-sm text-mca-ink-subtle">
        Need a different account?{" "}
        <Link
          href="/auth/sign-in"
          className="font-medium text-mca-ink-body underline decoration-mca-hint underline-offset-2 hover:text-mca-ink-strong"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
