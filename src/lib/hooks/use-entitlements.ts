"use client";

import { fetchJson } from "@/lib/client";
import type { EntitlementDTO } from "@/lib/dto/entitlements";
import { useCallback, useEffect, useState } from "react";

export type UseEntitlementsResult = {
  entitlements: EntitlementDTO | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * Client mirror of `GET /api/entitlements` — use for gating upgrade UI (respect `suppressCommercialUi`).
 */
export function useEntitlements(): UseEntitlementsResult {
  const [entitlements, setEntitlements] = useState<EntitlementDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      const r = await fetchJson<EntitlementDTO>("/api/entitlements", { cache: "no-store" });
      if (r.kind !== "ok") {
        setEntitlements(null);
        setError(r.kind === "error" ? r.error : "Could not load entitlements.");
        setLoading(false);
        return;
      }
      const d = r.data;
      setEntitlements({
        tier: d.tier,
        displayTierSlug: d.displayTierSlug,
        suppressCommercialUi: d.suppressCommercialUi,
        limits: d.limits,
      });
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { entitlements, loading, error, reload: load };
}
