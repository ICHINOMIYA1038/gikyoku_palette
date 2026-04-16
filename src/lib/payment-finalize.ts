/**
 * 決済完了処理。Stripe webhook（本番）と dev/finalize（dev）から共有で呼ばれる。
 *
 * 副作用:
 *  - palette_payments: status=completed, payment_intent_id 記録
 *  - palette_permissions: status=permitted, permission_number 発行, paid_at 記録
 *  - palette_threads: lastMessage/lastAt 更新
 *  - palette_messages: system message "payment_completed" 挿入
 *  - palette_notifications: 申請者・作家それぞれに通知
 *
 * 既に permitted の場合は no-op。
 */

import { prisma } from "@/lib/db";
import { generatePermissionNumber } from "@/lib/utils";
import { createNotification } from "@/actions/notifications";

export type FinalizePaymentInput = {
  permissionId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
};

export type FinalizePaymentResult = {
  alreadyPermitted: boolean;
  threadId: string | null;
};

export async function finalizePayment(
  input: FinalizePaymentInput
): Promise<FinalizePaymentResult> {
  const existing = await prisma.palettePermission.findUnique({
    where: { id: input.permissionId },
    include: { thread: { select: { id: true } } },
  });
  if (!existing) {
    throw new Error(`permission not found: ${input.permissionId}`);
  }
  if (existing.status === "permitted") {
    return { alreadyPermitted: true, threadId: existing.thread?.id ?? null };
  }

  const permissionNumber = generatePermissionNumber();
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.palettePayment.updateMany({
      where: { stripeCheckoutSessionId: input.stripeCheckoutSessionId },
      data: {
        stripePaymentIntentId: input.stripePaymentIntentId,
        status: "completed",
        completedAt: now,
      },
    });

    await tx.palettePermission.update({
      where: { id: input.permissionId },
      data: {
        status: "permitted",
        permissionNumber,
        paidAt: now,
      },
    });

    if (existing.thread) {
      await tx.paletteMessage.create({
        data: {
          threadId: existing.thread.id,
          senderId: null,
          type: "system",
          content: "上演料の決済が完了しました",
          metadata: {
            kind: "payment_completed",
            permissionNumber,
            amount: existing.feeAmount,
          },
          createdAt: now,
        },
      });
      await tx.paletteThread.update({
        where: { id: existing.thread.id },
        data: { lastMessage: "上演料の決済が完了しました", lastAt: now },
      });
    }
  });

  // 通知（トランザクション外でOK）
  const permission = await prisma.palettePermission.findUniqueOrThrow({
    where: { id: input.permissionId },
    include: { play: { select: { title: true, authorId: true } } },
  });

  await createNotification({
    userId: permission.applicantId,
    type: "payment_completed",
    permissionId: input.permissionId,
    title: "上演が許可されました",
    message: `「${permission.play.title}」の上演料の決済が完了し、正式に上演が許可されました。許可証をダウンロードできます。`,
  });

  await createNotification({
    userId: permission.play.authorId,
    type: "payment_completed",
    permissionId: input.permissionId,
    title: "上演料の決済が完了しました",
    message: `「${permission.play.title}」の上演料の決済が完了しました。`,
  });

  return { alreadyPermitted: false, threadId: existing.thread?.id ?? null };
}
