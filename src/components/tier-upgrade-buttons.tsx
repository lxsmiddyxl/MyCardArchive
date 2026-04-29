"use client";

import { Button, ModalBase } from "@/mca-ui";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TEL = { componentName: "TierUpgradeButtons", surfaceName: "tier" } as const;

type Props = {
  tiers: { slug: string; name: string }[];
  currentSlug: string | null;
};

export function TierUpgradeButtons({ tiers, currentSlug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  async function upgrade(slug: string) {
    setPendingSlug(null);
    setLoading(slug);
    setMessage(null);
    mcaLog.event("tier.mock_upgrade.request", { from: currentSlug, to: slug }, TEL);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.rpc("mock_upgrade_user_tier", {
      p_tier_slug: slug,
    });
    setLoading(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    const payload = data as { ok?: boolean; error?: string } | null;
    if (payload && payload.ok === false && typeof payload.error === "string") {
      setMessage(payload.error);
      return;
    }
    mcaLog.event("tier.mock_upgrade.success", { slug }, TEL);
    router.refresh();
  }

  const pendingName = tiers.find((t) => t.slug === pendingSlug)?.name ?? pendingSlug;

  return (
    <div className="space-y-mca-base" aria-busy={loading !== null}>
      <ModalBase
        isOpen={pendingSlug !== null}
        onClose={() => setPendingSlug(null)}
        title={pendingName ? `Switch to ${pendingName}?` : "Confirm tier change"}
        panelClassName="max-w-md"
      >
        <p className="text-sm leading-relaxed text-mca-ink-muted">
          This updates your plan row in the database for local testing only—no payment. Downgrading
          may affect limits immediately.
        </p>
        <div className="mt-mca-lg flex flex-wrap justify-end gap-mca-sm">
          <Button type="button" variant="secondary" onClick={() => setPendingSlug(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={loading !== null || !pendingSlug}
            onClick={() => pendingSlug && void upgrade(pendingSlug)}
          >
            {loading && pendingSlug ? "Applying…" : "Confirm switch"}
          </Button>
        </div>
      </ModalBase>

      {message && (
        <p className="text-sm text-mca-accent-deep dark:text-mca-accent" role="status">
          {message}
        </p>
      )}
      <p className="text-sm text-mca-ink-muted">
        Higher tiers raise caps on binders, cards in your collection, and monthly scans—pick the plan
        that fits how you play and trade.
      </p>
      <div className="flex flex-wrap gap-mca-sm">
        {tiers.map((t) => (
          <button
            key={t.slug}
            type="button"
            disabled={loading !== null || t.slug === currentSlug}
            onClick={() => setPendingSlug(t.slug)}
            className="rounded-mca-control border border-mca-field-border bg-mca-chrome/60 px-mca-base py-mca-sm text-sm font-medium text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-border-subtle/60 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === t.slug
              ? "Upgrading…"
              : t.slug === currentSlug
                ? `${t.name} (current)`
                : `Switch to ${t.name}`}
          </button>
        ))}
      </div>
      <p className="text-xs text-mca-ink-subtle">
        Mock upgrades call{" "}
        <code className="rounded bg-mca-chrome px-mca-micro py-mca-trace font-mono text-mca-ink-body">
          mock_upgrade_user_tier
        </code>{" "}
        (database RPC). For testing only.
      </p>
    </div>
  );
}
