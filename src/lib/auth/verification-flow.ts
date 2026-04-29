import type { SupabaseClient } from "@supabase/supabase-js";

export type VerificationType = "signup" | "email_change" | "recovery";

export type VerificationParams = {
  code: string | null;
  tokenHash: string | null;
  type: string | null;
};

export type ParsedVerificationParams = VerificationParams & {
  hasParams: boolean;
  matchesExpectedType: boolean;
};

export type VerificationExchangeResult =
  | { ok: true; method: "code" | "otp" }
  | { ok: false; reason: "missing_params" | "type_mismatch" | "exchange_failed" };

export function parseVerificationParams(
  params: URLSearchParams,
  expectedType: VerificationType
): ParsedVerificationParams {
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const hasParams = Boolean(code || tokenHash);
  const matchesExpectedType = Boolean(code || (tokenHash && type === expectedType));
  return { code, tokenHash, type, hasParams, matchesExpectedType };
}

/**
 * Exchange a Supabase verification link into an authenticated session.
 * Supports both code-based and token_hash OTP formats.
 */
export async function exchangeVerificationLink(
  supabase: SupabaseClient,
  params: VerificationParams,
  expectedType: VerificationType
): Promise<VerificationExchangeResult> {
  const { code, tokenHash, type } = params;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? { ok: false, reason: "exchange_failed" } : { ok: true, method: "code" };
  }

  if (tokenHash && type === expectedType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: expectedType,
    });
    return error ? { ok: false, reason: "exchange_failed" } : { ok: true, method: "otp" };
  }

  if (!code && !tokenHash) return { ok: false, reason: "missing_params" };
  return { ok: false, reason: "type_mismatch" };
}

export function hasExpectedVerificationParams(
  params: URLSearchParams,
  expectedType: VerificationType
): boolean {
  const parsed = parseVerificationParams(params, expectedType);
  return parsed.hasParams && parsed.matchesExpectedType;
}
