"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe/client";

export async function createExpressAccount() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let stripeAccount = await prisma.paletteStripeAccount.findUnique({
    where: { userId: session.user.id },
  });

  if (!stripeAccount) {
    const account = await getStripe().accounts.create({
      type: "express",
      country: "JP",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    stripeAccount = await prisma.paletteStripeAccount.create({
      data: {
        userId: session.user.id,
        stripeAccountId: account.id,
      },
    });
  }

  return stripeAccount;
}

export async function createAccountLink() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const stripeAccount = await prisma.paletteStripeAccount.findUnique({
    where: { userId: session.user.id },
  });

  if (!stripeAccount) {
    return { error: "Stripeアカウントが見つかりません" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const accountLink = await getStripe().accountLinks.create({
    account: stripeAccount.stripeAccountId,
    refresh_url: `${appUrl}/dashboard/stripe`,
    return_url: `${appUrl}/dashboard/stripe?onboarding=complete`,
    type: "account_onboarding",
  });

  return { url: accountLink.url };
}

export async function getStripeAccountStatus() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const stripeAccount = await prisma.paletteStripeAccount.findUnique({
    where: { userId: session.user.id },
  });

  if (!stripeAccount) return null;

  const account = await getStripe().accounts.retrieve(
    stripeAccount.stripeAccountId
  );

  const isComplete = account.charges_enabled && account.payouts_enabled;

  if (isComplete && !stripeAccount.onboardingCompleted) {
    await prisma.paletteStripeAccount.update({
      where: { id: stripeAccount.id },
      data: { onboardingCompleted: true },
    });
  }

  return {
    id: stripeAccount.stripeAccountId,
    onboardingCompleted: isComplete,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  };
}

export async function createCheckoutSession(permissionId: string) {
  const authSession = await auth();
  if (!authSession?.user?.id) redirect("/login");

  const permission = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    include: {
      play: true,
    },
  });

  if (!permission || permission.applicantId !== authSession.user.id) {
    return { error: "権限がありません" };
  }

  if (permission.status !== "approved") {
    return { error: "この申請は決済できる状態ではありません" };
  }

  // Get author's Stripe account via raw query
  const stripeAccounts = await prisma.paletteStripeAccount.findUnique({
    where: { userId: permission.play.authorId },
  });

  if (!stripeAccounts?.onboardingCompleted) {
    return { error: "執筆者のStripeアカウントが準備できていません" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

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
    payment_intent_data: {
      application_fee_amount: permission.platformFee,
      transfer_data: {
        destination: stripeAccounts.stripeAccountId,
      },
    },
    success_url: `${appUrl}/permissions/${permissionId}?payment=success`,
    cancel_url: `${appUrl}/permissions/${permissionId}/pay?payment=cancelled`,
    metadata: {
      permissionId,
    },
  });

  // Save checkout session
  await prisma.palettePayment.create({
    data: {
      permissionId,
      stripeCheckoutSessionId: checkoutSession.id,
      amount: permission.feeAmount,
      platformFee: permission.platformFee,
      authorAmount: permission.feeAmount - permission.platformFee,
    },
  });

  return { url: checkoutSession.url };
}
