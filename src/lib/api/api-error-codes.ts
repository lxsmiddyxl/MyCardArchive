/**
 * Stable machine codes for `error.code` in JSON API envelopes (Phase 28).
 * Keep values UPPER_SNAKE — safe for logs, clients, and CI assertions.
 */
export const ApiErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  BAD_REQUEST: "BAD_REQUEST",
  CONFLICT: "CONFLICT",
  PAYLOAD_INVALID: "PAYLOAD_INVALID",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  SUPABASE_QUERY: "SUPABASE_QUERY",
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export function httpStatusToApiErrorCode(status: number): ApiErrorCode {
  if (status === 401) return ApiErrorCode.UNAUTHORIZED;
  if (status === 403) return ApiErrorCode.FORBIDDEN;
  if (status === 404) return ApiErrorCode.NOT_FOUND;
  if (status === 409) return ApiErrorCode.CONFLICT;
  if (status === 429) return ApiErrorCode.RATE_LIMITED;
  if (status === 400 || status === 405 || status === 415 || status === 422) return ApiErrorCode.BAD_REQUEST;
  if (status === 503) return ApiErrorCode.SERVICE_UNAVAILABLE;
  return ApiErrorCode.INTERNAL;
}
