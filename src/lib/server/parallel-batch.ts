/**
 * Chunked async processing to avoid oversized `Promise.all` fan-out (Phase 68).
 */
export async function batchInChunks<T, R>(
  items: readonly T[],
  chunkSize: number,
  worker: (chunk: T[]) => Promise<R[]>
): Promise<R[]> {
  const size = Math.max(1, Math.floor(chunkSize));
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const part = await worker(chunk);
    out.push(...part);
  }
  return out;
}
