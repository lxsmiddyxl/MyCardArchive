import type { ScanPackId } from "@/lib/billing/scan-packs-config";
import { fetchWithRetry } from "@/lib/http/fetch-with-retry";

export type StripeCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export type StripeCheckoutRequest =
  | { kind: "subscription"; tier: "pro" | "elite" | "business" }
  | { kind: "scan_pack"; packId: ScanPackId };

export async function postStripeCheckout(
  req: StripeCheckoutRequest
): Promise<StripeCheckoutResult> {
  const body =
    req.kind === "subscription"
      ? { tier: req.tier }
      : { scan_pack: req.packId };

  const res = await fetchWithRetry("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!res.ok) {
    return { ok: false, error: data.error ?? `Checkout failed (${res.status})` };
  }
  if (data.url) {
    return { ok: true, url: data.url };
  }
  return { ok: false, error: "No checkout URL returned" };
}
