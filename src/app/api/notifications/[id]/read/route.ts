import { markNotificationRead } from "@/lib/notifications/db";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function readErrorStatus(message: string): number {
  if (message.includes("not found") || message === "Notification not found.") return 404;
  return 400;
}

async function PATCH_handler(_request: Request, context: { params: Record<string, string> }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = context.params.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const result = await markNotificationRead(supabase, id, user.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: readErrorStatus(result.error) });
  }

  return NextResponse.json({ ok: true });
}

export const PATCH = defineRoute("PATCH /api/notifications/[id]/read", PATCH_handler);
