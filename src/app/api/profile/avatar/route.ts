import { uploadUserAvatar } from "@/lib/storage/avatar-upload";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/profile/avatar", surfaceName: "profile.avatar" } as const;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength === 0 || buf.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Invalid image size" }, { status: 400 });
  }

  const up = await uploadUserAvatar(supabase, user.id, buf);
  if ("error" in up) {
    mcaLog.event("profile.avatar", { ok: false, message: up.error }, CTX);
    return NextResponse.json(
      { error: up.error || "Upload failed — ensure Storage bucket exists and policies allow your session." },
      { status: 500 }
    );
  }

  const { data: row, error } = await supabase
    .from("profiles")
    .update({ avatar_url: up.publicUrl })
    .eq("id", user.id)
    .select("id, avatar_url")
    .maybeSingle();

  if (error) {
    mcaLog.event(
      "profile.avatar",
      { ok: false, reason: "profiles_update", message: error.message, code: error.code },
      CTX
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!row) {
    mcaLog.event(
      "profile.avatar",
      {
        ok: false,
        reason: "no_profile_row_or_rls",
        userId: user.id,
        hint: "Ensure public.profiles has a row for this user and RLS allows UPDATE + SELECT for own id.",
      },
      CTX
    );
    return NextResponse.json(
      {
        error:
          "Could not save avatar URL to your profile (no row returned). Check profiles RLS and that a profiles row exists.",
      },
      { status: 500 }
    );
  }

  await supabase.rpc("ensure_social_public_profile_projection", { p_user_id: user.id });
  mcaLog.event("profile.avatar", { ok: true, userId: user.id }, CTX);

  return NextResponse.json({ avatar_url: row.avatar_url ?? up.publicUrl });
}

export const POST = defineRouteSimple("POST /api/profile/avatar", POST_handler);
