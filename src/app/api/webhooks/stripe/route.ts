import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { prisma } from "@/lib/db";
import { generatePermissionNumber } from "@/lib/utils";
import { createNotification } from "@/actions/notifications";
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
  } catch (err) {
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const permissionId = session.metadata?.permissionId;

    if (permissionId) {
      // Update payment
      await prisma.payment.updateMany({
        where: { stripeCheckoutSessionId: session.id },
        data: {
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id || null,
          status: "completed",
          completedAt: new Date(),
        },
      });

      // Update permission to permitted
      const permissionNumber = generatePermissionNumber();
      const permission = await prisma.performancePermission.update({
        where: { id: permissionId },
        data: {
          status: "permitted",
          permissionNumber,
          paidAt: new Date(),
        },
        include: { play: true },
      });

      // Notify both parties
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
    }
  }

  return NextResponse.json({ received: true });
}
