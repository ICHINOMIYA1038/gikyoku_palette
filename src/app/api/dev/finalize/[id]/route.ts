/**
 * Dev-only payment finalizer.
 *
 * Stripe Checkout のリダイレクト先（success_url）に指定して、
 * payment_status=paid のセッションを検証し、共通 finalize ロジックを呼ぶ。
 * 本番では Stripe webhook 経由で同じ finalizePayment() が走るため挙動は等価。
 *
 * NODE_ENV=development 以外では 404。
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { finalizePayment } from "@/lib/payment-finalize";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { id: permissionId } = await params;
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  const checkoutSession = await getStripe().checkout.sessions.retrieve(sessionId);
  if (checkoutSession.payment_status !== "paid") {
    return NextResponse.json(
      { error: `checkout not paid: ${checkoutSession.payment_status}` },
      { status: 400 }
    );
  }

  const paymentIntentId =
    typeof checkoutSession.payment_intent === "string"
      ? checkoutSession.payment_intent
      : checkoutSession.payment_intent?.id || null;

  const result = await finalizePayment({
    permissionId,
    stripeCheckoutSessionId: sessionId,
    stripePaymentIntentId: paymentIntentId,
  });

  const dest = result.threadId
    ? `/threads/${result.threadId}?payment=success`
    : `/permissions/${permissionId}?payment=success`;
  return NextResponse.redirect(new URL(dest, req.url));
}
