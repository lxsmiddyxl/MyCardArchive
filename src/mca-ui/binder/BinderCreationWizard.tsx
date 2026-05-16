"use client";

import { extractApiErrorMessage, extractApiPayload } from "@/lib/client";
import {
  BINDER_KIND_LABELS,
  BINDER_WIZARD_KINDS,
  formatBinderDescription,
  type BinderWizardKind,
} from "@/lib/onboarding/binder-wizard-types";
import { resolveBinderAccent } from "@/lib/binders/binder-accent";
import { cn } from "@/lib/ui/cn";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import { mcaLog } from "@/lib/logging/mca-log-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const ACCENT_PREVIEW_IDS = ["preview-a", "preview-b", "preview-c", "preview-d", "preview-e", "preview-f"];

export type BinderCreationWizardProps = {
  onCreated?: (binderId: string) => void;
  redirectOnSuccess?: boolean;
};

export function BinderCreationWizard({
  onCreated,
  redirectOnSuccess = true,
}: BinderCreationWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<BinderWizardKind>("custom");
  const [accentIndex, setAccentIndex] = useState(0);
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [atBinderLimit, setAtBinderLimit] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  const previewId = ACCENT_PREVIEW_IDS[accentIndex % ACCENT_PREVIEW_IDS.length]!;
  const accent = useMemo(() => resolveBinderAccent(previewId), [previewId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/tier/status");
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (cancelled) return;
      setStatusLoading(false);
      if (res.ok && payload?.at_binder_limit === true) setAtBinderLimit(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a binder name.");
      return;
    }
    if (atBinderLimit || statusLoading) return;

    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/binders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: trimmed,
        description: formatBinderDescription(kind, description),
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setError(extractApiErrorMessage(payload) ?? "Could not create binder.");
      if (res.status === 403) setAtBinderLimit(true);
      return;
    }

    const data = extractApiPayload(payload) as { binder?: { id: string } };
    const binderId = data?.binder?.id;
    if (!binderId) {
      setError("Binder created but id missing.");
      return;
    }

    mcaLog.event("binder.wizard.create", { kind }, { componentName: "BinderCreationWizard", surfaceName: "binder-new" });
    onCreated?.(binderId);
    if (redirectOnSuccess) {
      router.push(`/binders/${binderId}`);
      router.refresh();
    }
  }

  if (atBinderLimit) {
    return (
      <Panel className="border border-mca-warning-surface-border/50 bg-mca-warning-surface/25 p-mca-lg">
        <p className="text-sm text-mca-warning-tint">
          You&apos;ve reached your binder limit.{" "}
          <Link href="/tier" className="font-semibold text-mca-accent underline-offset-2 hover:underline">
            View plans
          </Link>
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="space-y-mca-lg">
      <p className="text-mca-caption font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Step {step + 1} of 3
      </p>

      {step === 0 ? (
        <div className="space-y-mca-md">
          <Field label="Binder name" id="wizard-name">
            <input
              id="wizard-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mca-input w-full rounded-mca-card px-mca-base py-mca-tight text-sm"
              placeholder="e.g. Scarlet & Violet master set"
              disabled={submitting}
            />
          </Field>
          <div>
            <p className="mb-mca-sm text-sm font-medium text-mca-ink-body">Binder type</p>
            <div className="grid gap-mca-sm sm:grid-cols-2">
              {BINDER_WIZARD_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-mca-card border px-mca-base py-mca-compact text-left text-sm transition duration-200 ease-mca-standard",
                    kind === k
                      ? "border-mca-accent-border/50 bg-mca-accent-border/10 text-mca-accent"
                      : "border-mca-border-subtle text-mca-ink-muted hover:border-mca-border"
                  )}
                >
                  <span className="font-semibold">{BINDER_KIND_LABELS[k]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-mca-md">
          <p className="text-sm text-mca-ink-muted">Pick an accent preview for your shelf.</p>
          <div className="flex flex-wrap gap-mca-sm">
            {ACCENT_PREVIEW_IDS.map((id, i) => {
              const a = resolveBinderAccent(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAccentIndex(i)}
                  className={cn(
                    "h-10 w-10 rounded-full border-2 transition duration-200 ease-mca-standard",
                    accentIndex === i ? "border-mca-ink-strong scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: a.color }}
                  aria-label={`Accent ${i + 1}`}
                />
              );
            })}
          </div>
          <div
            className={cn("rounded-mca-card border p-mca-lg", accent.borderClass, accent.surfaceClass)}
            style={{ borderColor: accent.color }}
          >
            <p className="text-sm font-semibold text-mca-ink-body">{name.trim() || "Your binder"}</p>
            <p className="mt-mca-xs text-mca-caption text-mca-ink-subtle">{BINDER_KIND_LABELS[kind]}</p>
          </div>
          <Field label="Cover image URL (optional)" id="wizard-cover">
            <input
              id="wizard-cover"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="mca-input w-full rounded-mca-card px-mca-base py-mca-tight text-sm"
              placeholder="Preview only — stored locally for now"
            />
          </Field>
          {coverUrl.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl.trim()} alt="" className="h-24 w-full rounded-mca-card object-cover" />
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <Field label="Description (optional)" id="wizard-desc">
          <textarea
            id="wizard-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mca-input w-full rounded-mca-card px-mca-base py-mca-tight text-sm"
            placeholder="What's this binder for?"
          />
        </Field>
      ) : null}

      {error ? (
        <p className="text-sm text-mca-accent" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-between gap-mca-sm">
        <Button
          type="button"
          variant="secondary"
          disabled={step === 0 || submitting}
          onClick={() => setStep((s) => s - 1)}
        >
          Back
        </Button>
        {step < 2 ? (
          <Button
            type="button"
            variant="primary"
            disabled={!name.trim() || statusLoading}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </Button>
        ) : (
          <Button type="button" variant="primary" disabled={submitting || statusLoading} onClick={() => void submit()}>
            {submitting ? "Creating…" : "Create binder"}
          </Button>
        )}
      </div>
    </Panel>
  );
}
