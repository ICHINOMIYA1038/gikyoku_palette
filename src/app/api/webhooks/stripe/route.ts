/**
 * 本番 Stripe webhook 受信エンドポイント。
 * checkout.session.completed を受けて共通 finalize ロジックを実行する。
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { finalizePayment } from "@/lib/payment-finalize";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const permissionId = checkoutSession.metadata?.permissionId;

    if (permissionId) {
      const paymentIntentId =
        typeof checkoutSession.payment_intent === "string"
          ? checkoutSession.payment_intent
          : checkoutSession.payment_intent?.id || null;

      await finalizePayment({
        permissionId,
        stripeCheckoutSessionId: checkoutSession.id,
        stripePaymentIntentId: paymentIntentId,
      });
    }
  }

  return NextResponse.json({ received: true });
}
