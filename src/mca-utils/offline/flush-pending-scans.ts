import {
  listPendingScans,
  markPendingScanError,
  removePendingScan,
} from "@/mca-utils/offline/cache";

function base64ToBlob(b64: string, mime: string): Blob {
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function flushPendingScans(): Promise<{
  synced: number;
  errors: { id: string; message: string }[];
}> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, errors: [] };
  }
  const rows = await listPendingScans();
  let synced = 0;
  const errors: { id: string; message: string }[] = [];

  for (const row of rows) {
    try {
      const fd = new FormData();
      fd.append("image", base64ToBlob(row.imageBase64, row.mimeType), "scan.jpg");
      if (row.backImageBase64) {
        fd.append("image_back", base64ToBlob(row.backImageBase64, row.mimeType), "scan-back.jpg");
      }
      const res = await fetch("/api/scan/v2", { method: "POST", body: fd });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        const msg = json.error ?? `HTTP ${res.status}`;
        await markPendingScanError(row.id, msg);
        errors.push({ id: row.id, message: msg });
        continue;
      }
      await removePendingScan(row.id);
      synced += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      await markPendingScanError(row.id, msg);
      errors.push({ id: row.id, message: msg });
    }
  }
  return { synced, errors };
}
