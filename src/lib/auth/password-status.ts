import type { User } from "@supabase/supabase-js";

function asStringSet(values: unknown[]): Set<string> {
  const out = new Set<string>();
  for (const v of values) {
    if (typeof v === "string" && v.trim()) out.add(v.trim().toLowerCase());
  }
  return out;
}

/**
 * Collect all identity/provider names attached to this user.
 * Supabase can expose provider data from multiple places depending on flow.
 */
function getAllProviders(user: User): Set<string> {
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const identityProviders = asStringSet(
    identities.map((i) =>
      i && typeof i === "object" && "provider" in i
        ? (i as { provider?: unknown }).provider
        : undefined
    )
  );

  const appProvidersRaw =
    user.app_metadata &&
    typeof user.app_metadata === "object" &&
    "providers" in user.app_metadata
      ? (user.app_metadata as { providers?: unknown }).providers
      : undefined;
  const appProviders = Array.isArray(appProvidersRaw)
    ? asStringSet(appProvidersRaw)
    : new Set<string>();
  return new Set<string>([...identityProviders, ...appProviders]);
}

function hasPasswordSetupCompleteMetadata(user: User): boolean {
  return Boolean(
    user.user_metadata &&
      typeof user.user_metadata === "object" &&
      "password_setup_complete" in user.user_metadata &&
      (user.user_metadata as { password_setup_complete?: unknown }).password_setup_complete === true
  );
}

function getUserMetadata(user: User): Record<string, unknown> {
  return user.user_metadata && typeof user.user_metadata === "object"
    ? (user.user_metadata as Record<string, unknown>)
    : {};
}

/**
 * True when user has an explicit password identity/provider.
 */
export function hasPasswordIdentity(user: User | null): boolean {
  if (!user) return false;
  const providers = getAllProviders(user);
  return providers.has("email");
}

/**
 * True when user has any OAuth provider identity (google, github, etc).
 */
export function hasOAuthIdentity(user: User | null): boolean {
  if (!user) return false;
  const providers = getAllProviders(user);
  return [...providers].some((p) => p !== "email" && p !== "phone");
}

/**
 * True when user has a pending email-change confirmation flow.
 */
export function hasPendingEmailChange(user: User | null): boolean {
  if (!user) return false;
  const metadata = getUserMetadata(user);
  const hasEmailChange = typeof metadata.email_change === "string" && metadata.email_change.trim().length > 0;
  const hasSentAt =
    typeof metadata.email_change_sent_at === "string" &&
    metadata.email_change_sent_at.trim().length > 0;
  return hasEmailChange || hasSentAt;
}

/**
 * True when a user account is email/password based but not confirmed yet.
 */
export function hasUnconfirmedSignup(user: User | null): boolean {
  if (!user) return false;
  return hasPasswordIdentity(user) && !user.email_confirmed_at;
}

/**
 * OAuth-only users (e.g. Google-only identities) must set an account password
 * so they can use universal recovery flows.
 */
export function isPasswordMissingForUser(user: User | null): boolean {
  if (!user) return false;
  const passwordIdentity = hasPasswordIdentity(user);
  const oauthIdentity = hasOAuthIdentity(user);
  const passwordSetupComplete = hasPasswordSetupCompleteMetadata(user);
  return oauthIdentity && !passwordIdentity && !passwordSetupComplete;
}

/**
 * Detect whether the current request looks like a Supabase recovery callback.
 * We support both common forms:
 * - `?code=...` (PKCE style exchangeCodeForSession)
 * - `?token_hash=...&type=recovery` (OTP verify style)
 */
export function hasPasswordRecoveryParams(params: URLSearchParams): boolean {
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  return Boolean(code || (tokenHash && type === "recovery"));
}

