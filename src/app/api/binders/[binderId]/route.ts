import { createClient } from "@/lib/supabase/server";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = context.params["binderId"]?.trim();
    if (!id) {
      return NextResponse.json({ error: "Invalid binder id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("binders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ binder: data });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function PATCH_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = context.params["binderId"]?.trim();
    if (!id) {
      return NextResponse.json({ error: "Invalid binder id" }, { status: 400 });
    }

    let body: { name?: string; description?: string | null };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const patch: { name?: string; description?: string | null } = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }
      patch.name = trimmed;
    }

    if (typeof body.description === "string") {
      patch.description = body.description.trim() || null;
    } else if (body.description === null) {
      patch.description = null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("binders")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ binder: data });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function DELETE_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = context.params["binderId"]?.trim();
    if (!id) {
      return NextResponse.json({ error: "Invalid binder id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("binders")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const GET = defineRoute("GET /api/binders/[binderId]", GET_handler);
export const PATCH = defineRoute("PATCH /api/binders/[binderId]", PATCH_handler);
export const DELETE = defineRoute("DELETE /api/binders/[binderId]", DELETE_handler);
