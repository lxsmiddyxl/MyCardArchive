"use client";

import { safeNextPath } from "@/lib/auth/safe-next-path";
import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import { mcaLog } from "@/lib/logging/mca-log-client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type Props = {
  /** Screen reader / visual title */
  heading?: string;
  /** Subtitle under heading */
  subtitle?: string;
};

type SignupResult =
  | { ok: true; reason: "email_confirmation_required" | "signed_in"; message: string; requiresEmailConfirmation: boolean }
  | { ok: false; reason: string; error: string };

function isSupabaseEnvMissing(): boolean {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function SignupForm({
  heading = "Create account",
  subtitle = "Sign up to organize Pokémon cards in binders, build decks, and trade with confidence.",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const inviteCode = searchParams.get("invite")?.trim().toUpperCase() ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [variant, setVariant] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(false);
  const [emailConfirmationState, setEmailConfirmationState] = useState<{
    email: string;
    reason: string;
  } | null>(null);
  const envMissing = useMemo(() => isSupabaseEnvMissing(), []);
  const telemetryCtx = { componentName: "SignupForm", surfaceName: "auth.sign-up" } as const;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (envMissing) {
      setVariant("error");
      setMessage(
        "Authentication is not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      mcaLog.event("auth.signup", { ok: false, reason: "supabase_env_missing" }, telemetryCtx);
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);
    if (!emailOk) {
      setVariant("error");
      setMessage("Please enter a valid email address.");
      mcaLog.event("auth.signup", { ok: false, reason: "invalid_email" }, telemetryCtx);
      return;
    }
    if (password.length < 6) {
      setVariant("error");
      setMessage("Password must be at least 6 characters.");
      mcaLog.event("auth.signup", { ok: false, reason: "password_too_short" }, telemetryCtx);
      return;
    }
    if (password !== confirmPassword) {
      setVariant("error");
      setMessage("Passwords do not match.");
      mcaLog.event("auth.signup", { ok: false, reason: "password_mismatch" }, telemetryCtx);
      return;
    }

    setMessage(null);
    setVariant("idle");
    setLoading(true);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const emailRedirectTo = `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`;

      const r = await fetchJson<SignupResult & { ok: boolean }>("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrimmed,
          password,
          emailRedirectTo,
          ...(inviteCode ? { inviteCode } : {}),
        }),
      });
      if (r.kind !== "ok") {
        setVariant("error");
        setMessage(fetchJsonErrorMessage(r));
        mcaLog.event("auth.signup", { ok: false, reason: "request_failed" }, telemetryCtx);
        return;
      }
      const payload = r.data as SignupResult;

      if (!payload.ok) {
        const reason = payload.reason;
        const err = payload.error;
        setVariant("error");
        setMessage(err);
        mcaLog.event("auth.signup", { ok: false, reason }, telemetryCtx);
        return;
      }

      if (payload.reason === "signed_in") {
        setVariant("success");
        setMessage("Account ready — redirecting…");
        mcaLog.event("auth.signup", { ok: true, reason: "signed_in" }, telemetryCtx);
        router.refresh();
        router.push(next);
        return;
      }

      setVariant("success");
      setEmailConfirmationState({ email: emailTrimmed, reason: payload.reason });
      mcaLog.event("auth.signup", { ok: true, reason: payload.reason }, telemetryCtx);
      router.refresh();
    } catch {
      setVariant("error");
      setMessage("Something went wrong. Please try again.");
      mcaLog.event("auth.signup", { ok: false, reason: "network_error" }, telemetryCtx);
    } finally {
      setLoading(false);
    }
  }

  if (emailConfirmationState) {
    return (
      <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
        <h1 className="text-center text-xl font-semibold text-mca-ink-strong">
          Check your email
        </h1>
        <p className="mt-mca-sm text-center text-sm text-mca-ink-muted">
          We sent a confirmation link to <strong>{emailConfirmationState.email}</strong>.
        </p>
        <p className="mt-mca-sm text-center text-sm text-mca-ink-muted">
          Open the email and confirm your account, then return to sign in.
        </p>
        <div className="mt-mca-lg flex flex-col gap-mca-sm">
          <Link
            href={`/auth/confirm-signup?email=${encodeURIComponent(emailConfirmationState.email)}`}
            className="w-full rounded-mca-control border border-mca-border-subtle bg-mca-surface px-mca-base py-mca-tight text-center text-sm font-semibold text-mca-ink-body shadow-mca-panel transition-all duration-200 ease-mca-standard hover:bg-mca-surface-elevated"
          >
            Resend confirmation email
          </Link>
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(next)}`}
            className="w-full rounded-mca-control bg-mca-surface-paper px-mca-base py-mca-tight text-center text-sm font-semibold text-mca-on-accent shadow-mca-panel transition-all duration-200 ease-mca-standard hover:opacity-90"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
      <h1 className="text-center text-xl font-semibold text-mca-ink-strong">
        {heading}
      </h1>
      <p className="mt-mca-sm text-center text-sm text-mca-ink-muted">{subtitle}</p>
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

      <form onSubmit={handleSubmit} className="mt-mca-lg space-y-mca-base">
        {inviteCode ? (
          <p className="rounded-mca-control border border-mca-border bg-mca-surface-paper/50 px-mca-compact py-mca-sm text-sm text-mca-ink-muted">
            Invite code: <span className="font-mono text-mca-ink-strong">{inviteCode}</span>
          </p>
        ) : null}
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
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading || envMissing}
            className="mca-input mt-mca-sm"
          />
        </div>
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-medium uppercase tracking-wide text-mca-ink-subtle"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading || envMissing}
            className="mca-input mt-mca-sm"
          />
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
          className="w-full rounded-mca-control bg-mca-accent-strong/90 px-mca-base py-mca-tight text-sm font-semibold text-mca-on-accent shadow-mca-panel transition-all duration-200 ease-mca-standard hover:bg-mca-accent hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      <p className="mt-mca-base text-center text-sm text-mca-ink-subtle">
        Didn&apos;t get an email?{" "}
        <Link
          href={email ? `/auth/confirm-signup?email=${encodeURIComponent(email)}` : "/auth/confirm-signup"}
          className="font-medium text-mca-ink-body underline decoration-mca-hint underline-offset-2 hover:text-mca-ink-strong"
        >
          Resend confirmation
        </Link>
      </p>

      <p className="mt-mca-lg text-center text-sm text-mca-ink-subtle">
        Already have an account?{" "}
        <Link
          href={`/auth/sign-in?next=${encodeURIComponent(next)}`}
          className="font-medium text-mca-ink-body underline decoration-mca-hint underline-offset-2 hover:text-mca-ink-strong"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
