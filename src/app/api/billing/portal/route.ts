import { getSiteUrlFromRequest } from "@/lib/billing/site-url";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

  const service = createServiceRoleClient();
  if (!service) {
    return NextResponse.json(
      { error: "Server billing misconfigured (SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 503 }
    );
  }

  const { data: row } = await service
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer yet. Subscribe from the tier page first." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const base = getSiteUrlFromRequest(request);

  const portal = await stripe.billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: `${base}/tier`,
  });

  if (!portal.url) {
    return NextResponse.json(
      { error: "Stripe did not return a portal URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: portal.url });
}

export const POST = defineRouteSimple("POST /api/billing/portal", POST_handler);
