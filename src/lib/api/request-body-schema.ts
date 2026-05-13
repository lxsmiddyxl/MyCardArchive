import type { ZodTypeAny } from "zod";

export function parseRequestBodyZod<T>(
  raw: unknown,
  schema: ZodTypeAny
): { ok: true; data: T } | { ok: false; message: string } {
  const r = schema.safeParse(raw);
  if (!r.success) {
    const message = r.error.issues
      .map((i) => `${i.path.length ? i.path.join(".") : "body"}: ${i.message}`)
      .join("; ");
    return { ok: false, message };
  }
  return { ok: true, data: r.data as T };
}
