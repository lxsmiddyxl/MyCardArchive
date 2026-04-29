"use client";

import { hasPendingEmailChange } from "@/lib/auth/password-status";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { supabaseBrowser } from "@/lib/supabase/browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const TEL = { componentName: "ConfirmEmailChangePage", surfaceName: "auth.confirm-email-change" } as const;

function getPendingEmail(user: { user_metadata?: unknown }): string | null {
  if (!user.user_metadata || typeof user.user_metadata !== "object") return null;
  const value = (user.user_metadata as { email_change?: unknown }).email_change;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function hasEmailChangeSentAt(user: { user_metadata?: unknown }): boolean {
  if (!user.user_metadata || typeof user.user_metadata !== "object") return false;
  const value = (user.user_metadata as { email_change_sent_at?: unknown }).email_change_sent_at;
  return typeof value === "string" && value.trim().length > 0;
}

export default function ConfirmEmailChangePage() {
  const router = useRouter();
  const [loadingSession, setLoadingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [variant, setVariant] = useState<"idle" | "success" | "error">("idle");
  const [currentEmail, setCurrentEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingSentAt, setPendingSentAt] = useState(false);
  const [hasPendingState, setHasPendingState] = useState(false);

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
          router.replace("/auth/sign-in?next=/auth/confirm-email-change");
          return;
        }
        setCurrentEmail(user.email ?? "");
        setPendingEmail(getPendingEmail(user));
        setPendingSentAt(hasEmailChangeSentAt(user));
        setHasPendingState(hasPendingEmailChange(user));
      } catch {
        if (!cancelled) {
          setVariant("error");
          setMessage("Could not load email-change status. Please refresh.");
        }
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleResend() {
    setSubmitting(true);
    setVariant("idle");
    setMessage(null);
    try {
      const supabase = supabaseBrowser();
      const redirectTo = `${window.location.origin}/auth/verify-email-change`;
      const targetEmail = pendingEmail;
      if (!targetEmail) {
        setVariant("error");
        setMessage(
          pendingSentAt
            ? "Confirmation was already sent. Check your inbox for the latest link."
            : "No pending email address found to resend confirmation."
        );
        return;
      }

      const { error } = await supabase.auth.resend({
        type: "email_change",
        email: targetEmail,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setVariant("error");
        setMessage(error.message);
        mcaLog.event("auth.email_change", { ok: false, reason: "resend_failed" }, TEL);
        return;
      }
      setVariant("success");
      setMessage("Confirmation email sent. Check your inbox.");
      mcaLog.event("auth.email_change", { ok: true, reason: "resend_sent" }, TEL);
    } catch {
      setVariant("error");
      setMessage("Could not resend email. Please try again.");
      mcaLog.event("auth.email_change", { ok: false, reason: "resend_network_error" }, TEL);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    setSubmitting(true);
    setVariant("idle");
    setMessage(null);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.updateUser({ email: currentEmail });
      if (error) {
        setVariant("error");
        setMessage(error.message);
        mcaLog.event("auth.email_change", { ok: false, reason: "cancel_failed" }, TEL);
        return;
      }
      setVariant("success");
      setMessage("Email change cancelled. Redirecting to settings...");
      mcaLog.event("auth.email_change", { ok: true, reason: "cancelled" }, TEL);
      window.setTimeout(() => router.push("/profile/edit"), 900);
    } catch {
      setVariant("error");
      setMessage("Could not cancel email change. Please try again.");
      mcaLog.event("auth.email_change", { ok: false, reason: "cancel_network_error" }, TEL);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingSession) {
    return (
      <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl text-center text-sm text-mca-ink-subtle shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
        Loading...
      </div>
    );
  }

  if (!hasPendingState) {
    return (
      <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
        <h1 className="text-center text-xl font-semibold text-mca-ink-strong">Email change status</h1>
        <p className="mt-mca-sm text-center text-sm text-mca-ink-muted">
          No pending email change was found for your account.
        </p>
        <div className="mt-mca-lg">
          <Link
            href="/profile/edit"
            className="w-full inline-flex justify-center rounded-mca-control bg-mca-surface-paper px-mca-base py-mca-tight text-sm font-semibold text-mca-on-accent shadow-mca-panel transition-all duration-200 ease-mca-standard hover:opacity-90"
          >
            Go to settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-xl shadow-mca-card shadow-black/40 dark:border-mca-border-subtle">
      <h1 className="text-center text-xl font-semibold text-mca-ink-strong">Confirm new email</h1>
      <p className="mt-mca-sm text-center text-sm text-mca-ink-muted">
        Your new email address needs confirmation.
      </p>
      {pendingEmail ? (
        <p className="mt-mca-sm text-center text-sm text-mca-ink-subtle">
          Pending change to <strong>{pendingEmail}</strong>
        </p>
      ) : null}

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

      <div className="mt-mca-lg space-y-mca-sm">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleResend()}
          className="w-full rounded-mca-control bg-mca-surface-paper px-mca-base py-mca-tight text-sm font-semibold text-mca-on-accent shadow-mca-panel transition-all duration-200 ease-mca-standard hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Working..." : "Resend confirmation email"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleCancel()}
          className="w-full rounded-mca-control border border-mca-border-subtle bg-mca-surface px-mca-base py-mca-tight text-sm font-semibold text-mca-ink-body shadow-mca-panel transition-all duration-200 ease-mca-standard hover:bg-mca-surface-elevated disabled:opacity-50"
        >
          Cancel email change
        </button>
      </div>
    </div>
  );
}
