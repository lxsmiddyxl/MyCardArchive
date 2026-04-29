import {

  coerceDisplayName,

  coerceHandle,

  isOffensive,

  sanitizeDisplayName,

  sanitizeHandle,

  validateProfileInput,

} from "@/lib/validation/profile";

import { mcaLog } from "@/lib/logging/mca-log-server";

import { defineRouteSimple } from "@/lib/server/api-route";

import { createClient } from "@/lib/supabase/route";

import { NextResponse } from "next/server";



const CTX = { componentName: "api/profile/update", surfaceName: "profile.update" } as const;



type Body = {

  display_name?: string;

  handle?: string;

  bio?: string;

  location?: string;

  website?: string;

  favorite_card?: string;

  favorite_set?: string;

  favorite_color?: string;

};



async function POST_handler(request: Request) {

  const supabase = createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();

  if (!user) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  let body: Body;

  try {

    body = (await request.json()) as Body;

  } catch {

    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  }



  const displaySan = sanitizeDisplayName(String(body.display_name ?? ""));

  const handleSan = sanitizeHandle(String(body.handle ?? ""));

  const bioRaw = String(body.bio ?? "").trim();

  const locationRaw = String(body.location ?? "").trim();

  const websiteRaw = String(body.website ?? "").trim();

  const favCard = String(body.favorite_card ?? "").trim().slice(0, 80);

  const favSet = String(body.favorite_set ?? "").trim().slice(0, 80);

  const favColor = String(body.favorite_color ?? "").trim().slice(0, 32);



  const displayAfterOffense = isOffensive(displaySan)

    ? coerceDisplayName(displaySan, user.id)

    : { value: displaySan, adjusted: false };

  const displayFinal = displayAfterOffense.value;



  let handleForDb: string | null = null;

  let handleAdjusted = false;

  if (handleSan) {

    if (isOffensive(handleSan)) {

      const c = coerceHandle(handleSan, user.id);

      handleForDb = c.value;

      handleAdjusted = c.adjusted;

    } else {

      handleForDb = handleSan;

    }

  }



  const check = validateProfileInput({

    display_name: displayFinal,

    handle: handleForDb ? handleForDb : undefined,

    bio: bioRaw,

    location: locationRaw,

    website: websiteRaw,

    favorite_card: favCard,

    favorite_set: favSet,

    favorite_color: favColor,

  });



  if (!check.valid) {

    mcaLog.event("profile.update", { ok: false, reason: "validation", errors: check.errors }, CTX);

    return NextResponse.json(

      { error: check.errors[0] ?? "Validation failed", errors: check.errors },

      { status: 400 }

    );

  }



  await supabase.rpc("ensure_social_public_profile_projection", { p_user_id: user.id });



  const { data: row, error } = await supabase

    .from("profiles")

    .update({

      display_name: displayFinal || null,

      handle: handleForDb,

      bio: bioRaw || null,

      location: locationRaw || null,

      website: websiteRaw || null,

      favorite_card: favCard || null,

      favorite_set: favSet || null,

      favorite_color: favColor || null,

    })

    .eq("id", user.id)

    .select(

      "id, email, username, avatar_url, display_name, handle, bio, location, website, favorite_card, favorite_set, favorite_color, joined_at, created_at"

    )

    .maybeSingle();



  if (error) {

    if (error.code === "23505" || /unique|duplicate/i.test(error.message)) {

      return NextResponse.json(

        { error: "That handle is already taken. Try another one.", code: "handle_taken" },

        { status: 409 }

      );

    }

    mcaLog.event("profile.update", { ok: false, reason: "db", message: error.message }, CTX);

    return NextResponse.json({ error: error.message }, { status: 500 });

  }



  mcaLog.event("profile.update", { ok: true, userId: user.id }, CTX);

  return NextResponse.json({

    profile: row,

    adjusted: displayAfterOffense.adjusted || handleAdjusted,

  });

}



export const POST = defineRouteSimple("POST /api/profile/update", POST_handler);


