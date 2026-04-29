"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import { supabaseBrowser } from "@/lib/supabase/browser";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

const TEL = { componentName: "ConfirmSignupPage", surfaceName: "auth.confirm-signup" } as const;

export default function ConfirmSignupPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [newEmail, setNewEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [variant, setVariant] = useState<"idle" | "success" | "error">("idle");
  const [loadingResend, setLoadingResend] = useState(false);
  const [loadingChange, setLoadingChange] = useState(false);

  const redirectTo = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/auth/verify-signup` : ""),
    []
  );

  async function handleResend() {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setVariant("error");
      setMessage("Enter your signup email to resend confirmation.");
      return;
    }
    setLoadingResend(true);
    setVariant("idle");
    setMessage(null);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setVariant("error");
        setMessage(error.message);
        mcaLog.event("auth.confirm_signup", { ok: false, reason: "resend_failed" }, TEL);
        return;
      }
      setVariant("success");
      setMessage("Confirmation email sent. Check your inbox.");
      mcaLog.event("auth.confirm_signup", { ok: true, reason: "resend_sent" }, TEL);
    } catch {
      setVariant("error");
      setMessage("Could not resend confirmation. Please try again.");
      mcaLog.event("auth.confirm_signup", { ok: false, reason: "resend_network_error" }, TEL);
    } finally {
      setLoadingResend(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    const replacement = newEmail.trim().toLowerCase();
    if (!replacement) {
      setVariant("error");
      setMessage("Enter a new email address.");
      return;
    }
    setLoadingChange(true);
    setVariant("idle");
    setMessage(null);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.updateUser({ email: replacement });
      if (error) {
        setVariant("error");
        setMessage(error.message);
        mcaLog.event("auth.confirm_signup", { ok: false, reason: "change_email_failed" }, TEL);
        return;
      }
      setEmail(replacement);
      setNewEmail("");
      setVariant("success");
      setMessage("Email updated. Check your inbox to confirm the new address.");
      mcaLog.event("auth.confirm_signup", { ok: true, reason: "email_changed" }, TEL);
    } catch {
      setVariant("error");
      setMessage("Could not update email. Please try again.");
      mcaLog.event("auth.confirm_signup", { ok: false, reason: "change_email_network_error" }, TEL);
    } finally {
      setLoadingChange(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
      <h1 className="text-center text-xl font-semibold text-mca-ink-strong">Confirm your account</h1>
      <p className="mt-mca-sm text-center text-sm text-mca-ink-muted">
        Your account isn&apos;t confirmed yet.
      </p>

      <div className="mt-mca-lg space-y-mca-base">
        <div>
          <label
            htmlFor="confirm-signup-email"
            className="block text-xs font-medium uppercase tracking-wide text-mca-ink-subtle"
          >
            Signup email
          </label>
          <input
            id="confirm-signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loadingResend || loadingChange}
            className="mt-mca-sm w-full rounded-mca-control border border-mca-border-subtle bg-mca-surface px-mca-compact py-mca-tight text-sm text-mca-ink-strong shadow-mca-panel transition-all placeholder:text-mca-ink-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-60"
          />
        </div>

        <button
          type="button"
          disabled={loadingResend || loadingChange}
          onClick={() => void handleResend()}
          className="w-full rounded-mca-control bg-mca-surface-paper px-mca-base py-mca-tight text-sm font-semibold text-mca-on-accent shadow-mca-panel transition-all duration-200 ease-mca-standard hover:opacity-90 disabled:opacity-50"
        >
          {loadingResend ? "Sending..." : "Resend confirmation email"}
        </button>
      </div>

      <form onSubmit={handleChangeEmail} className="mt-mca-lg space-y-mca-base">
        <div>
          <label
            htmlFor="confirm-signup-new-email"
            className="block text-xs font-medium uppercase tracking-wide text-mca-ink-subtle"
          >
            Change email
          </label>
          <input
            id="confirm-signup-new-email"
            name="newEmail"
            type="email"
            autoComplete="email"
            placeholder="new-email@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={loadingResend || loadingChange}
            className="mt-mca-sm w-full rounded-mca-control border border-mca-border-subtle bg-mca-surface px-mca-compact py-mca-tight text-sm text-mca-ink-strong shadow-mca-panel transition-all placeholder:text-mca-ink-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={loadingResend || loadingChange}
          className="w-full rounded-mca-control border border-mca-border-subtle bg-mca-surface px-mca-base py-mca-tight text-sm font-semibold text-mca-ink-body shadow-mca-panel transition-all duration-200 ease-mca-standard hover:bg-mca-surface-elevated disabled:opacity-50"
        >
          {loadingChange ? "Updating..." : "Change email"}
        </button>
      </form>

      {message ? (
        <p
          role="status"
          className={
            variant === "success"
              ? "mt-mca-base text-sm text-mca-success-bold dark:text-mca-success"
              : "mt-mca-base text-sm text-mca-accent-deep dark:text-mca-accent"
          }
        >
          {message}
        </p>
      ) : null}

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
