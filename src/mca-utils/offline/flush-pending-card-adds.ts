import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import type { BinderAddMutationResponseDTO } from "@/lib/dto/scan-add";
import {
  listPendingCardAdds,
  markPendingCardAddError,
  removePendingCardAdd,
  type PendingCardAdd,
} from "@/mca-utils/offline/cache";

export type FlushPendingResult = {
  synced: number;
  failed: number;
  errors: { id: string; message: string }[];
};

export async function flushPendingCardAdds(): Promise<FlushPendingResult> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0, errors: [] };
  }

  const rows = await listPendingCardAdds();
  let synced = 0;
  let failed = 0;
  const errors: { id: string; message: string }[] = [];

  for (const row of rows) {
    const result = await postPendingRow(row);
    if (result.ok) {
      await removePendingCardAdd(row.id);
      synced += 1;
    } else {
      failed += 1;
      const msg = result.message;
      errors.push({ id: row.id, message: msg });
      await markPendingCardAddError(row.id, msg);
    }
  }

  return { synced, failed, errors };
}

async function postPendingRow(
  row: PendingCardAdd
): Promise<{ ok: true } | { ok: false; message: string }> {
  const r = await fetchJson<BinderAddMutationResponseDTO>("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row.body),
  });
  if (r.kind === "ok") return { ok: true };
  return { ok: false, message: fetchJsonErrorMessage(r) };
}
