import {
  stripePriceIdForPaidTier,
  type PaidTierSlug,
} from "@/lib/billing/price-to-tier";
import {
  effectiveScanPackUnitCents,
  getScanPackDefinition,
  isScanPackId,
  stripePriceIdForScanPack,
} from "@/lib/billing/scan-packs-config";
import { defineRouteSimple } from "@/lib/server/api-route";
import { getSiteUrlFromRequest } from "@/lib/billing/site-url";
import { logServerError } from "@/lib/server/observability";
import { createClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Body = { tier?: string; scan_pack?: string };

async function ensureStripeCustomerId(
  userId: string,
  email: string | undefined
): Promise<{ customerId: string } | NextResponse> {
  const service = createServiceRoleClient();
  if (!service) {
    return NextResponse.json(
      { error: "Server billing misconfigured (SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 503 }
    );
  }

  const { data: existing } = await service
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  const stripe = getStripe();
  let customerId = existing?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email ?? undefined,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;
    const { error: upsertErr } = await service.from("stripe_customers").upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
      },
      { onConflict: "user_id" }
    );
    if (upsertErr) {
      logServerError({
        scope: "api",
        route: "/api/billing/checkout",
        userId,
        err: upsertErr,
      });
      return NextResponse.json(
        { error: "Could not save Stripe customer" },
        { status: 500 }
      );
    }
  }

  return { customerId };
}

async function POST_handler(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured (STRIPE_SECRET_KEY)" },
      { status: 503 }
    );
  }

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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const packRaw = body.scan_pack?.toLowerCase()?.trim();
  if (packRaw) {
    if (!isScanPackId(packRaw)) {
      return NextResponse.json(
        { error: "scan_pack must be small, medium, or large" },
        { status: 400 }
      );
    }

    const ensured = await ensureStripeCustomerId(user.id, user.email ?? undefined);
    if (ensured instanceof NextResponse) {
      return ensured;
    }
    const { customerId } = ensured;
    const def = getScanPackDefinition(packRaw);
    const stripe = getStripe();
    const base = getSiteUrlFromRequest(request);
    const priceId = stripePriceIdForScanPack(packRaw);

    const lineItems = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${def.label} (${def.blurb})`,
                description: "One-time scan pack — adds bonus scans to your account.",
              },
              unit_amount: effectiveScanPackUnitCents(packRaw),
            },
            quantity: 1,
          },
        ];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: lineItems,
      success_url: `${base}/tier?billing=scan_pack_success&pack=${encodeURIComponent(packRaw)}`,
      cancel_url: `${base}/tier?billing=cancel`,
      client_reference_id: user.id,
      metadata: {
        purchase_type: "scan_pack",
        scan_pack_id: packRaw,
        bonus_scans: String(def.bonusScans),
        supabase_user_id: user.id,
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  }

  const tierRaw = body.tier?.toLowerCase()?.trim();
  if (tierRaw !== "pro" && tierRaw !== "elite" && tierRaw !== "business") {
    return NextResponse.json(
      {
        error:
          "Provide tier (pro|elite|business) or scan_pack (small|medium|large)",
      },
      { status: 400 }
    );
  }

  const tier = tierRaw as PaidTierSlug;
  const priceId = stripePriceIdForPaidTier(tier);
  if (!priceId) {
    const missing =
      tier === "pro"
        ? "STRIPE_PRICE_PRO is not set"
        : tier === "elite"
          ? "STRIPE_PRICE_ELITE is not set"
          : "STRIPE_PRICE_BUSINESS is not set";
    return NextResponse.json({ error: missing }, { status: 503 });
  }

  const ensured = await ensureStripeCustomerId(user.id, user.email ?? undefined);
  if (ensured instanceof NextResponse) {
    return ensured;
  }
  const { customerId } = ensured;

  const stripe = getStripe();
  const base = getSiteUrlFromRequest(request);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/tier?billing=success`,
    cancel_url: `${base}/tier?billing=cancel`,
    client_reference_id: user.id,
    metadata: {
      supabase_user_id: user.id,
      tier_slug: tier,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        tier_slug: tier,
      },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}

export const POST = defineRouteSimple("POST /api/billing/checkout", POST_handler);
