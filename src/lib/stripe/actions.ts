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

/**
 * 申請者が Stripe Checkout を開始する。
 * 成功・キャンセルどちらも /threads/{threadId} に戻す。
 * dev 環境かつ作家の Stripe Connect が未完の場合は Connect バイパスで決済可能にする
 * （/api/dev/checkout の挙動と等価。本番では NODE_ENV ガードで無効）。
 */
export async function createCheckoutSession(permissionId: string) {
  const authSession = await auth();
  if (!authSession?.user?.id) redirect("/login");

  const permission = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    include: { play: true, thread: { select: { id: true } } },
  });

  if (!permission || permission.applicantId !== authSession.user.id) {
    return { error: "権限がありません" };
  }
  if (permission.status !== "approved") {
    return { error: "この申請は決済できる状態ではありません" };
  }
  if (!permission.thread) {
    return { error: "スレッドが見つかりません" };
  }

  const stripeAccount = await prisma.paletteStripeAccount.findUnique({
    where: { userId: permission.play.authorId },
  });
  const connectReady = !!stripeAccount?.onboardingCompleted;
  const isDev = process.env.NODE_ENV === "development";

  if (!connectReady && !isDev) {
    return {
      error:
        "執筆者のStripe連携が完了していないため、現在お支払いをお受けできません。執筆者へお問い合わせください。",
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const threadUrl = `${appUrl}/threads/${permission.thread.id}`;

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
    // Connect が完了していれば作家口座へ直接送金、未完（dev）なら自プラットフォームに留まる
    ...(connectReady
      ? {
          payment_intent_data: {
            application_fee_amount: permission.platformFee,
            transfer_data: { destination: stripeAccount!.stripeAccountId },
          },
        }
      : {}),
    success_url: connectReady
      ? `${threadUrl}?payment=success`
      : `${appUrl}/api/dev/finalize/${permissionId}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${threadUrl}?payment=cancelled`,
    metadata: {
      permissionId,
      ...(connectReady ? {} : { devBypass: "1" }),
    },
  });

  // 二度目以降は同じ permission に対して上書き（idempotent）
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

  return { url: checkoutSession.url };
}
