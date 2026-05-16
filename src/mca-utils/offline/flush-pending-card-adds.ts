import { fetchJson } from "@/lib/client";
import type { BinderAddMutationResponseDTO } from "@/lib/dto/scan-add";
import {
  listPendingCardAdds,
  removePendingCardAdd,
  type PendingCardAdd,
} from "@/mca-utils/offline/pending-card-add";

export async function flushPendingCardAdds(): Promise<{
  synced: number;
  failed: number;
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const rows = listPendingCardAdds();
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    const ok = await postPendingRow(row);
    if (ok) {
      removePendingCardAdd(row.id);
      synced += 1;
    } else {
      failed += 1;
    }
  }

  return { synced, failed };
}

async function postPendingRow(row: PendingCardAdd): Promise<boolean> {
  const r = await fetchJson<BinderAddMutationResponseDTO>("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row.body),
  });
  return r.kind === "ok";
}
