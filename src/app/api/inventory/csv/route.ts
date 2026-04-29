import { defineRouteNoArgs } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/server";
import { getUserTier } from "@/lib/tier/check-limits";
import { isBusinessTier } from "@/lib/tier/scan-tier-policy";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function escapeCsvCell(v: string | null | undefined): string {
  const s = String(v ?? "").replace(/"/g, '""');
  if (/[",\n\r]/.test(s)) return `"${s}"`;
  return s;
}

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(supabase);
  if (!tier || !isBusinessTier(tier)) {
    return NextResponse.json(
      { error: "CSV export is available on the Business plan. Upgrade on /tier." },
      { status: 403 }
    );
  }

  const { data: rows, error } = await supabase
    .from("cards")
    .select(
      "id,name,number,rarity,image_url,for_trade,looking_for,catalog_card_id,created_at,binders(name)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "binder_name",
    "card_name",
    "number",
    "rarity",
    "for_trade",
    "looking_for",
    "image_url",
    "catalog_card_id",
    "card_id",
    "created_at",
  ];

  const lines: string[] = [header.join(",")];

  for (const row of rows ?? []) {
    const binderName =
      row.binders && typeof row.binders === "object" && "name" in row.binders
        ? String((row.binders as { name: string }).name)
        : "";
    lines.push(
      [
        escapeCsvCell(binderName),
        escapeCsvCell(row.name),
        escapeCsvCell(row.number),
        escapeCsvCell(row.rarity),
        row.for_trade ? "true" : "false",
        row.looking_for ? "true" : "false",
        escapeCsvCell(row.image_url),
        escapeCsvCell(row.catalog_card_id),
        escapeCsvCell(row.id),
        escapeCsvCell(row.created_at),
      ].join(",")
    );
  }

  const body = lines.join("\r\n");

  const { error: usageErr } = await supabase.rpc("record_csv_export_usage", { p_user_id: user.id });
  if (usageErr) {
    return NextResponse.json({ error: usageErr.message }, { status: 500 });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mycardarchive-collection.csv"',
      "Cache-Control": "no-store",
    },
  });
}

export const GET = defineRouteNoArgs("GET /api/inventory/csv", GET_handler);
