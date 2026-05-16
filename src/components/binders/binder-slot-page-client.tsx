"use client";

import { BinderSlotView } from "@/mca-ui/binder/BinderSlotView";
import { requestBinderSurfacesRefresh } from "@/lib/binders/binder-surfaces-refresh";
import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import type { BinderSlotDTO } from "@/lib/dto/binder";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type Props = {
  binderId: string;
  binderName: string;
  slot: BinderSlotDTO | null;
  page: number;
  slotIndex: number;
};

export function BinderSlotPageClient({
  binderId,
  binderName,
  slot,
  page,
  slotIndex,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = `/api/binders/${encodeURIComponent(binderId)}`;

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const fromRef = { page, slot: slotIndex };

  return (
    <>
      {error ? (
        <p className="rounded-mca-card border border-mca-error-border/50 bg-mca-error-surface/20 px-mca-compact py-mca-sm text-sm text-mca-error-text">
          {error}
        </p>
      ) : null}
      <BinderSlotView
        binderId={binderId}
        binderName={binderName}
        slot={slot}
        page={page}
        slotIndex={slotIndex}
        busy={busy}
        onMove={(to) =>
          void run(async () => {
            const r = await fetchJson(`${apiBase}/move`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ from: fromRef, to }),
            });
            if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
            requestBinderSurfacesRefresh(binderId);
            router.push(`/binders/${binderId}/pages?page=${to.page}`);
            router.refresh();
          })
        }
        onCopy={(to) =>
          void run(async () => {
            if (!slot?.card_id) return;
            const r = await fetchJson(`${apiBase}/copy`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ card_id: slot.card_id, to }),
            });
            if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
            requestBinderSurfacesRefresh(binderId);
            router.push(`/binders/${binderId}/pages?page=${to.page}`);
            router.refresh();
          })
        }
        onRemove={(deleteCard) =>
          void run(async () => {
            const r = await fetchJson(`${apiBase}/remove`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                page_number: page,
                slot_index: slotIndex,
                delete_card: deleteCard,
              }),
            });
            if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
            requestBinderSurfacesRefresh(binderId);
            router.push(`/binders/${binderId}/pages?page=${page}`);
            router.refresh();
          })
        }
        onReplace={() => {
          router.push(
            `/binders/${encodeURIComponent(binderId)}/add-card?page=${page}&slot=${slotIndex}`
          );
        }}
      />
    </>
  );
}
