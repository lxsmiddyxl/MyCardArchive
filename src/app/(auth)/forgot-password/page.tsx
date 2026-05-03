"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";
import Link from "next/link";
import { useState } from "react";

function siteBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSuccess(false);
    setLoading(true);

    try {
      const base = siteBaseUrl();
      if (!base) {
        setSuccess(false);
        setMessage(
          "Could not determine site URL. Set NEXT_PUBLIC_SITE_URL or try again in the browser."
        );
        return;
      }

      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${base}/auth/reset-password`,
      });

      if (error) {
        setSuccess(false);
        setMessage(error.message);
        return;
      }

      setSuccess(true);
      setMessage("Check your email for a reset link.");
    } catch {
      setSuccess(false);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
      <h1 className="text-center text-xl font-semibold text-mca-ink-strong">
        Forgot password
      </h1>
      <p className="mt-mca-sm text-center text-sm text-mca-ink-muted">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

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
            className="mca-input mt-mca-sm"
          />
        </div>

        {message && (
          <p
            className={
              success
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
          disabled={loading}
          className="w-full rounded-mca-control bg-mca-surface-paper px-mca-base py-mca-tight text-sm font-semibold text-mca-on-accent shadow-mca-panel transition-all duration-200 ease-mca-standard hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send Reset Link"}
        </button>
      </form>

      <p className="mt-mca-lg text-center text-sm text-mca-ink-subtle">
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
