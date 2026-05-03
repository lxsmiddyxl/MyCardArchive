/**
 * Typed JSON fetch aligned with MCA route envelopes:
 * success: `{ success: true, context_id?, ...payload }`
 * error: `{ success: false, error, context_id? }` (often with non-2xx status).
 */

export type McaApiSuccessBody<T extends Record<string, unknown> = Record<string, unknown>> = {
  success: true;
  context_id?: string;
} & T;

export type McaApiErrorBody = {
  success: false;
  error: string;
  context_id?: string;
  [k: string]: unknown;
};

export type FetchJsonOk<T extends Record<string, unknown>> = {
  kind: "ok";
  status: number;
  data: McaApiSuccessBody<T>;
};

export type FetchJsonErr =
  | {
      kind: "error";
      status: number;
      error: string;
      contextId?: string;
      /** From `errorJson(..., extra)` (e.g. image upload user-facing copy). */
      userMessage?: string;
      /** Application-specific machine codes sometimes attached to failure payloads. */
      code?: string;
      /** Some routes (e.g. auth) return `{ ok: false, reason: "..." }`. */
      reason?: string;
    }
  | { kind: "network"; message: string }
  | { kind: "parse"; message: string };

export type FetchJsonResult<T extends Record<string, unknown>> = FetchJsonOk<T> | FetchJsonErr;

function asRecord(parsed: unknown): Record<string, unknown> {
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return {};
}

function normalizeSuccess<T extends Record<string, unknown>>(body: Record<string, unknown>): McaApiSuccessBody<T> {
  if (body.success === true) {
    return body as McaApiSuccessBody<T>;
  }
  return { ...body, success: true } as McaApiSuccessBody<T>;
}

/**
 * Parse a Response body as JSON and classify MCA envelope + HTTP status.
 * Use after `fetchWithRetry` or other wrappers that return `Response`.
 */
export async function readResponseJson<T extends Record<string, unknown> = Record<string, unknown>>(
  res: Response
): Promise<FetchJsonResult<T>> {
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    return { kind: "parse", message: "Invalid JSON" };
  }
  const body = asRecord(parsed);

  if (!res.ok) {
    const err =
      body.success === false && typeof body.error === "string"
        ? body.error
        : typeof body.error === "string"
          ? body.error
          : res.statusText || `Request failed (${res.status})`;
    return {
      kind: "error",
      status: res.status,
      error: err,
      contextId: typeof body.context_id === "string" ? body.context_id : undefined,
      userMessage: typeof body.userMessage === "string" ? body.userMessage : undefined,
      code: typeof body.code === "string" ? body.code : undefined,
      reason: typeof body.reason === "string" ? body.reason : undefined,
    };
  }

  if (body.success === false && typeof body.error === "string") {
    return {
      kind: "error",
      status: res.status,
      error: body.error,
      contextId: typeof body.context_id === "string" ? body.context_id : undefined,
      userMessage: typeof body.userMessage === "string" ? body.userMessage : undefined,
      code: typeof body.code === "string" ? body.code : undefined,
      reason: typeof body.reason === "string" ? body.reason : undefined,
    };
  }

  return { kind: "ok", status: res.status, data: normalizeSuccess<T>(body) };
}

/**
 * `fetch` + JSON envelope parsing.
 */
export async function fetchJson<T extends Record<string, unknown> = Record<string, unknown>>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<FetchJsonResult<T>> {
  try {
    const res = await fetch(input, init);
    return readResponseJson<T>(res);
  } catch (e) {
    return {
      kind: "network",
      message: e instanceof Error ? e.message : "Network error",
    };
  }
}

/** Plain-text body (e.g. deck export). Errors may be JSON `{ error }` or raw text. */
export type FetchTextResult =
  | { kind: "ok"; status: number; text: string }
  | { kind: "error"; status: number; message: string }
  | { kind: "network"; message: string };

export async function fetchText(input: RequestInfo | URL, init?: RequestInit): Promise<FetchTextResult> {
  try {
    const res = await fetch(input, init);
    const text = await res.text();
    if (!res.ok) {
      let msg = text;
      try {
        const j = JSON.parse(text) as { error?: string };
        if (typeof j.error === "string" && j.error.trim()) msg = j.error;
      } catch {
        /* plain text error body */
      }
      return {
        kind: "error",
        status: res.status,
        message: msg.trim() || res.statusText || `Request failed (${res.status})`,
      };
    }
    return { kind: "ok", status: res.status, text };
  } catch (e) {
    return {
      kind: "network",
      message: e instanceof Error ? e.message : "Network error",
    };
  }
}

export function fetchJsonErrorMessage(result: FetchJsonErr): string {
  if (result.kind === "error") return result.error;
  if (result.kind === "network") return result.message;
  return result.message;
}

/** Prefer server-provided `userMessage` when routes attach friendly copy. */
export function fetchJsonUserFacingMessage(result: FetchJsonErr): string {
  if (result.kind === "error" && result.userMessage) return result.userMessage;
  return fetchJsonErrorMessage(result);
}
