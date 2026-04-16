/**
 * Dev-only Stripe Checkout creator that bypasses Connect.
 *
 * The production `createCheckoutSession` requires the author to have completed
 * Stripe Connect Express onboarding. This endpoint short-circuits that for
 * local simulation: it creates a regular (non-Connect) Checkout Session using
 * the platform's test keys and stores the payment record. `success_url` points
 * at the dev finalizer which mirrors the webhook handler.
 *
 * Returns 404 outside development.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id: permissionId } = await params;
  const permission = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    include: { play: true },
  });

  if (!permission || permission.applicantId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (permission.status !== "approved") {
    return NextResponse.json(
      { error: `permission status is '${permission.status}', expected 'approved'` },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "jpy",
          product_data: {
            name: `上演許可: ${permission.play.title}`,
            description: `${permission.organizationName} - ${permission.performanceTitle}`,
          },
          unit_amount: permission.feeAmount,
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/api/dev/finalize/${permissionId}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/permissions/${permissionId}/pay?payment=cancelled`,
    metadata: { permissionId, devBypass: "1" },
  });

  await prisma.palettePayment.upsert({
    where: { permissionId },
    create: {
      permissionId,
      stripeCheckoutSessionId: checkoutSession.id,
      amount: permission.feeAmount,
      platformFee: permission.platformFee,
      authorAmount: permission.feeAmount - permission.platformFee,
    },
    update: {
      stripeCheckoutSessionId: checkoutSession.id,
      amount: permission.feeAmount,
      platformFee: permission.platformFee,
      authorAmount: permission.feeAmount - permission.platformFee,
      status: "pending",
    },
  });

  return NextResponse.json({ url: checkoutSession.url, id: checkoutSession.id });
}
