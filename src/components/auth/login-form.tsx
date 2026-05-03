"use client";

import { safeNextPath } from "@/lib/auth/safe-next-path";
import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { supabaseBrowser } from "@/lib/supabase/browser";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type LoginResult =
  | { ok: true; reason: "signed_in" }
  | { ok: false; reason: string; error: string };

function isSupabaseEnvMissing(): boolean {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const errorParam = searchParams.get("error");
  const verifiedParam = searchParams.get("verified");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(
    errorParam === "auth" ? "Could not complete sign-in. Try again." : null
  );
  const [variant, setVariant] = useState<"success" | "error">(
    errorParam === "auth" ? "error" : "success"
  );
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const envMissing = useMemo(() => isSupabaseEnvMissing(), []);
  const verifiedBanner = verifiedParam === "1" || verifiedParam === "true";
  const telemetryCtx = { componentName: "LoginForm", surfaceName: "auth.sign-in" } as const;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (envMissing) {
      setVariant("error");
      setMessage(
        "Authentication is not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      mcaLog.event("auth.login", { ok: false, reason: "supabase_env_missing" }, telemetryCtx);
      return;
    }

    setMessage(null);
    setLoading(true);

    try {
      const r = await fetchJson<{ ok: boolean; reason?: string; error?: string }>("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (r.kind !== "ok") {
        if (r.kind === "error" && r.reason === "email_not_confirmed") {
          const targetEmail = encodeURIComponent(email.trim().toLowerCase());
          mcaLog.event("auth.login", { ok: false, reason: "email_not_confirmed" }, telemetryCtx);
          router.push(`/auth/confirm-signup?email=${targetEmail}`);
          return;
        }
        setVariant("error");
        setMessage(fetchJsonErrorMessage(r));
        mcaLog.event(
          "auth.login",
          { ok: false, reason: r.kind === "error" ? r.reason ?? "signin_failed" : "network_error" },
          telemetryCtx
        );
        return;
      }
      const payload = r.data;
      if (!payload.ok) {
        const reason = payload.reason ?? "signin_failed";
        const err = payload.error ?? "Could not sign in.";
        if (reason === "email_not_confirmed") {
          const targetEmail = encodeURIComponent(email.trim().toLowerCase());
          mcaLog.event("auth.login", { ok: false, reason: "email_not_confirmed" }, telemetryCtx);
          router.push(`/auth/confirm-signup?email=${targetEmail}`);
          return;
        }
        setVariant("error");
        setMessage(err);
        mcaLog.event("auth.login", { ok: false, reason }, telemetryCtx);
        return;
      }

      mcaLog.event("auth.login", { ok: true, reason: payload.reason ?? "signed_in" }, telemetryCtx);
      router.refresh();
      router.push(next);
    } catch {
      setVariant("error");
      setMessage("Something went wrong. Please try again.");
      mcaLog.event("auth.login", { ok: false, reason: "network_error" }, telemetryCtx);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setMessage(null);
    setOauthLoading(true);
    try {
      const supabase = supabaseBrowser();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        setVariant("error");
        setMessage(error.message);
        mcaLog.event("auth.login", { ok: false, reason: "oauth_google_failed" }, telemetryCtx);
      }
    } catch {
      setVariant("error");
      setMessage("Could not start Google sign-in. Please try again.");
      mcaLog.event("auth.login", { ok: false, reason: "oauth_google_network_error" }, telemetryCtx);
    } finally {
      setOauthLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
      <h1 className="text-center text-xl font-semibold text-mca-ink-strong">Sign in</h1>
      <p className="mt-mca-sm text-center text-sm text-mca-ink-muted">
        Welcome back to MyCardArchive.
      </p>

      {envMissing && (
        <p
          role="alert"
          className="mt-mca-base rounded-mca-control border border-mca-warning-surface-border/70 bg-mca-warning-surface/30 px-mca-compact py-mca-sm text-sm text-mca-warning-tint"
        >
          Authentication is not configured. Add{" "}
          <code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </p>
      )}

      {verifiedBanner && (
        <p
          className="mt-mca-base rounded-mca-control border border-mca-focus-soft/60 bg-mca-success-surface/40 px-mca-compact py-mca-sm text-center text-sm text-mca-success-soft"
          role="status"
        >
          Email confirmed. You can sign in now.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-mca-lg space-y-mca-base">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium uppercase tracking-wide text-mca-ink-subtle"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || envMissing}
            className="mca-input mt-mca-sm"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-wide text-mca-ink-subtle"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || envMissing}
            className="mca-input mt-mca-sm"
          />
        </div>

        <div className="text-right">
          <Link
            href="/forgot-password"
            className="rounded-sm text-sm text-mca-ink-muted underline decoration-mca-hint underline-offset-2 transition-colors hover:text-mca-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60"
          >
            Forgot password?
          </Link>
        </div>

        {message && (
          <p
            className={
              variant === "success"
                ? "text-sm text-mca-success-bold dark:text-mca-success"
                : "text-sm text-mca-accent-deep dark:text-mca-accent"
            }
            role="status"
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || envMissing}
          className="w-full rounded-mca-control bg-mca-surface-paper px-mca-base py-mca-tight text-sm font-semibold text-mca-on-accent shadow-mca-panel transition-all duration-200 ease-mca-standard hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-mca-base">
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={oauthLoading || envMissing}
          className="w-full rounded-mca-control border border-mca-border-subtle bg-mca-surface px-mca-base py-mca-tight text-sm font-semibold text-mca-ink-body shadow-mca-panel transition-all duration-200 ease-mca-standard hover:bg-mca-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-50"
        >
          {oauthLoading ? "Redirecting to Google..." : "Continue with Google"}
        </button>
      </div>

      <p className="mt-mca-lg text-center text-sm text-mca-ink-subtle">
        No account?{" "}
        <Link
          href={`/auth/sign-up?next=${encodeURIComponent(next)}`}
          className="font-medium text-mca-ink-body underline decoration-mca-hint underline-offset-2 hover:text-mca-ink-strong"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}
