import { defineRouteSimple } from "@/lib/server/api-route";
import { grantScanPackFromCheckoutSession } from "@/lib/billing/scan-pack-grant";
import {
  resolveUserIdForStripeCustomer,
  syncUserTierFromSubscription,
} from "@/lib/billing/sync-subscription";
import { logServerError } from "@/lib/server/observability";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set" },
      { status: 503 }
    );
  }

  const service = createServiceRoleClient();
  if (!service) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not set" },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid payload";
    logServerError({ scope: "api", route: "/api/billing/webhook", err: message });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "payment") {
          const meta = session.metadata ?? {};
          if (meta.purchase_type === "scan_pack") {
            const userId = meta.supabase_user_id ?? null;
            const bonus = Number.parseInt(String(meta.bonus_scans ?? "0"), 10);
            const packId = String(meta.scan_pack_id ?? "").trim();
            if (userId && packId && bonus > 0 && session.id) {
              const customerRaw = session.customer;
              const customerId =
                typeof customerRaw === "string" ? customerRaw : customerRaw?.id;
              if (customerId) {
                await service.from("stripe_customers").upsert(
                  {
                    user_id: userId,
                    stripe_customer_id: customerId,
                  },
                  { onConflict: "user_id" }
                );
              }
              await grantScanPackFromCheckoutSession(service, {
                checkoutSessionId: session.id,
                userId,
                packId,
                bonusScans: bonus,
              });
            }
          }
          break;
        }

        if (session.mode === "subscription") {
          const userId = session.metadata?.supabase_user_id ?? null;
          const tierSlug = session.metadata?.tier_slug ?? null;
          const customerRaw = session.customer;
          const customerId =
            typeof customerRaw === "string" ? customerRaw : customerRaw?.id;

          if (
            userId &&
            customerId &&
            (tierSlug === "pro" || tierSlug === "elite")
          ) {
            await service.from("stripe_customers").upsert(
              {
                user_id: userId,
                stripe_customer_id: customerId,
              },
              { onConflict: "user_id" }
            );

            await service.rpc("apply_billing_user_tier", {
              p_user_id: userId,
              p_tier_slug: tierSlug,
            });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncUserTierFromSubscription(service, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerRaw = subscription.customer;
        const customerId =
          typeof customerRaw === "string" ? customerRaw : customerRaw?.id;
        const userId = await resolveUserIdForStripeCustomer(
          service,
          customerId
        );
        if (userId) {
          await service.rpc("apply_billing_user_tier", {
            p_user_id: userId,
            p_tier_slug: "free",
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    logServerError({ scope: "api", route: "/api/billing/webhook", err: e });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

export const POST = defineRouteSimple("POST /api/billing/webhook", POST_handler);
