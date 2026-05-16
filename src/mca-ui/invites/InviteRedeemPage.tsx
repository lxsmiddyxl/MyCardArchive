"use client";

import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function InviteRedeemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), "/auth/sign-up");
  const [code, setCode] = useState(searchParams.get("invite")?.toUpperCase() ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [variant, setVariant] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const r = await fetchJson<{ ok: boolean }>("/api/invites/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setLoading(false);
    if (r.kind !== "ok" || !r.data.ok) {
      setVariant("error");
      setMessage(r.kind !== "ok" ? fetchJsonErrorMessage(r) : "Invalid or used invite code.");
      return;
    }
    setVariant("success");
    setMessage("Invite accepted — continue to create your account.");
    const dest = next.includes("?")
      ? `${next}&invite=${encodeURIComponent(code)}`
      : `${next}?invite=${encodeURIComponent(code)}`;
    router.push(dest);
  }

  return (
    <div className="mx-auto max-w-md space-y-mca-lg px-mca-base py-mca-2xl">
      <div>
        <h1 className="text-mca-2xl font-bold text-mca-ink-strong">Enter invite code</h1>
        <p className="mt-mca-sm text-mca-sm text-mca-ink-muted">
          MyCardArchive is in early access. Use the code you received to sign up.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-mca-md">
        <Field id="invite-code" label="Invite code">
          <input
            id="invite-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="off"
            required
            className="mca-input w-full font-mono uppercase"
          />
        </Field>
        {message ? (
          <p
            className={
              variant === "success" ? "text-mca-sm text-mca-success-tint" : "text-mca-sm text-mca-error-accent"
            }
          >
            {message}
          </p>
        ) : null}
        <Button type="submit" disabled={loading || !code.trim()}>
          {loading ? "Checking…" : "Continue"}
        </Button>
      </form>
      <p className="text-mca-sm text-mca-ink-muted">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="text-mca-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
