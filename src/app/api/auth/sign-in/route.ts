import { createClient } from "@/lib/supabase/route";
import { defineRouteSimple } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

type SigninBody = {
  email?: string;
  password?: string;
};

function envMissing(): boolean {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

function classifySigninError(raw: string): { status: number; reason: string; message: string } {
  const msg = raw.toLowerCase();
  if (msg.includes("invalid login credentials")) {
    return {
      status: 401,
      reason: "invalid_credentials",
      message: "Invalid email or password.",
    };
  }
  if (msg.includes("email not confirmed")) {
    return {
      status: 403,
      reason: "email_not_confirmed",
      message: "Please confirm your email before signing in.",
    };
  }
  return {
    status: 400,
    reason: "signin_failed",
    message: raw || "Could not sign in. Please try again.",
  };
}

async function POST_handler(request: Request) {
  if (envMissing()) {
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

  let body: SigninBody;
  try {
    body = (await request.json()) as SigninBody;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_json", error: "Invalid request body." },
      { status: 400 }
    );
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, reason: "missing_fields", error: "Email and password are required." },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const mapped = classifySigninError(error.message);
    return NextResponse.json(
      { ok: false, reason: mapped.reason, error: mapped.message, raw: error.message },
      { status: mapped.status }
    );
  }

  return NextResponse.json({ ok: true, reason: "signed_in" }, { status: 200 });
}

export const POST = defineRouteSimple("POST /api/auth/sign-in", POST_handler);
