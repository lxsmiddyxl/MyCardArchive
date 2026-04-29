import { createClient } from "@/lib/supabase/route";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

type SignupBody = {
  email?: string;
  password?: string;
  emailRedirectTo?: string;
};

function envMissing(): boolean {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

function classifySignupError(raw: string): { status: number; reason: string; message: string } {
  const msg = raw.toLowerCase();
  if (msg.includes("smtp") || msg.includes("email provider")) {
    return {
      status: 503,
      reason: "smtp_not_configured",
      message:
        "Email sign-up is temporarily unavailable because email delivery is not configured.",
    };
  }
  if (msg.includes("already registered") || msg.includes("already exists")) {
    return {
      status: 409,
      reason: "email_already_registered",
      message: "That email is already registered. Try signing in instead.",
    };
  }
  if (msg.includes("password") || msg.includes("invalid email")) {
    return {
      status: 400,
      reason: "invalid_input",
      message: "Please enter a valid email and password.",
    };
  }
  return {
    status: 400,
    reason: "signup_failed",
    message: raw || "Could not create account. Please try again.",
  };
}

async function POST_handler(request: Request) {
  const telemetryCtx = { componentName: "api.auth.sign-up", surfaceName: "auth.api" } as const;

  if (envMissing()) {
    mcaLog.event("auth.signup", { ok: false, reason: "supabase_env_missing" }, telemetryCtx);
    return NextResponse.json(
      {
        ok: false,
        reason: "supabase_env_missing",
        error:
          "Authentication is not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      },
      { status: 503 }
    );
  }

  let body: SignupBody;
  try {
    body = (await request.json()) as SignupBody;
  } catch {
    mcaLog.event("auth.signup", { ok: false, reason: "invalid_json" }, telemetryCtx);
    return NextResponse.json(
      { ok: false, reason: "invalid_json", error: "Invalid request body." },
      { status: 400 }
    );
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const emailRedirectTo = body.emailRedirectTo?.trim();

  if (!email || !password) {
    mcaLog.event("auth.signup", { ok: false, reason: "missing_fields" }, telemetryCtx);
    return NextResponse.json(
      { ok: false, reason: "missing_fields", error: "Email and password are required." },
      { status: 400 }
    );
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });

    if (error) {
      const mapped = classifySignupError(error.message);
      mcaLog.event("auth.signup", { ok: false, reason: mapped.reason }, telemetryCtx);
      return NextResponse.json(
        { ok: false, reason: mapped.reason, error: mapped.message, raw: error.message },
        { status: mapped.status }
      );
    }

    const requiresEmailConfirmation = !data.session;
    mcaLog.event(
      "auth.signup",
      {
        ok: true,
        reason: requiresEmailConfirmation ? "email_confirmation_required" : "signed_in",
      },
      telemetryCtx
    );
    return NextResponse.json(
      {
        ok: true,
        reason: requiresEmailConfirmation ? "email_confirmation_required" : "signed_in",
        requiresEmailConfirmation,
        message: requiresEmailConfirmation
          ? "Account created. Check your email to confirm your account."
          : "Account created and signed in.",
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    mcaLog.event("auth.signup", { ok: false, reason: "server_exception", message }, telemetryCtx);
    return NextResponse.json(
      {
        ok: false,
        reason: "server_exception",
        error: "Signup failed unexpectedly. Please try again.",
      },
      { status: 500 }
    );
  }
}

export const POST = defineRouteSimple("POST /api/auth/sign-up", POST_handler);
