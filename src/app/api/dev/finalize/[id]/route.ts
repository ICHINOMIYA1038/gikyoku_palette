/**
 * Dev-only payment finalizer.
 *
 * Stripe Checkout redirects here on success (set by the dev checkout route).
 * Mirrors the logic of the production `/api/webhooks/stripe` handler so we
 * can finalize payments without running Stripe CLI for webhook forwarding.
 *
 * Returns 404 outside development.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/client";
import { generatePermissionNumber } from "@/lib/utils";
import { createNotification } from "@/actions/notifications";

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

  const existing = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
  });
  if (!existing) {
    return NextResponse.json({ error: "permission not found" }, { status: 404 });
  }

  // Idempotent: only transition once.
  if (existing.status === "permitted") {
    return NextResponse.redirect(
      new URL(`/permissions/${permissionId}?payment=success`, req.url)
    );
  }

  await prisma.palettePayment.updateMany({
    where: { stripeCheckoutSessionId: sessionId },
    data: {
      stripePaymentIntentId: paymentIntentId,
      status: "completed",
      completedAt: new Date(),
    },
  });

  const permission = await prisma.palettePermission.update({
    where: { id: permissionId },
    data: {
      status: "permitted",
      permissionNumber: generatePermissionNumber(),
      paidAt: new Date(),
    },
    include: { play: true },
  });

  await createNotification({
    userId: permission.applicantId,
    type: "payment_completed",
    permissionId,
    title: "上演が許可されました",
    message: `「${permission.play.title}」の上演料の決済が完了し、正式に上演が許可されました。許可証をダウンロードできます。`,
  });

  await createNotification({
    userId: permission.play.authorId,
    type: "payment_completed",
    permissionId,
    title: "上演料の決済が完了しました",
    message: `「${permission.play.title}」の上演料の決済が完了しました。`,
  });

  return NextResponse.redirect(
    new URL(`/permissions/${permissionId}?payment=success`, req.url)
  );
}
