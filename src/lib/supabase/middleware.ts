import { createServerClient } from "@supabase/ssr";
import {
  hasPendingEmailChange,
  hasPasswordRecoveryParams,
  hasUnconfirmedSignup,
  isPasswordMissingForUser,
} from "@/lib/auth/password-status";
import { hasExpectedVerificationParams } from "@/lib/auth/verification-flow";
import { ensureProfileAndPublic } from "@/lib/supabase/ensureProfile";
import {
  loadOnboardingFlags,
  shouldRedirectToOnboarding,
} from "@/mca-utils/onboarding/checkOnboarding";
import type { Database } from "@/lib/supabase/types";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { type NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
/**
 * Routes that require a Supabase session. Unauthenticated visitors are sent to
 * /auth/sign-in with ?next=<original path>.
 */
const PROTECTED_PREFIXES = [
  "/binders",
  "/decks",
  "/analytics",
  "/tier",
  "/pricing",
  "/scan",
  "/dev",
  "/market",
  "/community",
  "/feed",
  "/clubs",
  "/trades",
  "/collector",
  "/search",
  "/guides",
  "/showcase",
  "/mobile",
] as const;

/**
 * Auth marketing screens: signed-in users are redirected to the app hub.
 * /reset-password is intentionally omitted so password recovery can complete.
 */
const AUTH_MARKETING_SCREENS_REDIRECT_WHEN_AUTHENTICATED = [
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/confirm",
  "/auth/confirm-signup",
  "/auth/confirm-email-change",
  "/login",
  "/signup",
  "/create-account",
  "/forgot-password",
] as const;

function pathnameMatchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) =>
    pathnameMatchesPrefix(pathname, prefix)
  );
}

function isAuthMarketingScreen(pathname: string): boolean {
  return AUTH_MARKETING_SCREENS_REDIRECT_WHEN_AUTHENTICATED.some((p) =>
    pathnameMatchesPrefix(pathname, p)
  );
}

/**
 * Next.js middleware entry: refresh session cookies and enforce route rules.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[]
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
    db: { schema: "public" },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    try {
      await ensureProfileAndPublic(supabase as SupabaseClient<Database>, user);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[middleware] ensureProfileAndPublic failed", err);
      }
    }
  }

  const pathname = request.nextUrl.pathname;
  const isAuthResetPassword = pathnameMatchesPrefix(pathname, "/auth/reset-password");
  const recoveryParamsPresent = hasPasswordRecoveryParams(request.nextUrl.searchParams);
  const isVerifyEmailChange = pathnameMatchesPrefix(pathname, "/auth/verify-email-change");
  const isVerifySignup = pathnameMatchesPrefix(pathname, "/auth/verify-signup");
  const emailChangeVerificationParams = hasExpectedVerificationParams(
    request.nextUrl.searchParams,
    "email_change"
  );
  const signupVerificationParams = hasExpectedVerificationParams(request.nextUrl.searchParams, "signup");

  if (pathname.startsWith("/api/auth")) {
    return supabaseResponse;
  }

  if (user) {
    const passwordMissing = isPasswordMissingForUser(user);
    const pendingEmailChange = hasPendingEmailChange(user);
    const unconfirmedSignup = hasUnconfirmedSignup(user);
    const onSetPasswordScreen = pathnameMatchesPrefix(pathname, "/auth/set-password");
    const onConfirmEmailChange = pathnameMatchesPrefix(pathname, "/auth/confirm-email-change");
    const onConfirmSignup = pathnameMatchesPrefix(pathname, "/auth/confirm-signup");

    // Logged-in users should only see reset-password when opening a fresh recovery link.
    if (isAuthResetPassword && !recoveryParamsPresent) {
      return NextResponse.redirect(new URL("/profile/edit", request.url));
    }

    // Logged-in users should not use signup verification links directly.
    if (isVerifySignup) {
      return NextResponse.redirect(new URL("/feed", request.url));
    }

    // Logged-in users who already resolved email-change should go to settings.
    if (isVerifyEmailChange && !pendingEmailChange) {
      return NextResponse.redirect(new URL("/profile/edit", request.url));
    }

    // Pending email-change users are constrained to confirmation flow until resolved.
    if (
      pendingEmailChange &&
      !onConfirmEmailChange &&
      !(isVerifyEmailChange && emailChangeVerificationParams)
    ) {
      return NextResponse.redirect(new URL("/auth/confirm-email-change", request.url));
    }

    // Unconfirmed password-account users are constrained to signup confirmation flow.
    if (
      unconfirmedSignup &&
      !onConfirmSignup &&
      !(isVerifySignup && signupVerificationParams)
    ) {
      return NextResponse.redirect(new URL("/auth/confirm-signup", request.url));
    }

    // OAuth-only users must finish password setup before entering the app.
    if (passwordMissing && !onSetPasswordScreen) {
      return NextResponse.redirect(new URL("/auth/set-password", request.url));
    }

    // Signed-in users with complete auth should not stay on auth marketing screens.
    if (!passwordMissing && isAuthMarketingScreen(pathname)) {
      return NextResponse.redirect(new URL("/feed", request.url));
    }

  }

  if (user && !pathname.startsWith("/api")) {
    try {
      const flags = await loadOnboardingFlags(
        supabase as SupabaseClient<Database>,
        user.id
      );
      if (shouldRedirectToOnboarding(flags, pathname)) {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
    } catch {
      /* non-blocking — allow request if profile read fails */
    }
  }

  if (!user && isProtectedRoute(pathname)) {
    const redirectUrl = new URL("/auth/sign-in", request.url);
    const nextPath =
      pathname +
      (request.nextUrl.search && request.nextUrl.search.length > 0
        ? request.nextUrl.search
        : "");
    redirectUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
