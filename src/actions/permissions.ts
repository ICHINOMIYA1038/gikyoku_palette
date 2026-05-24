"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { permissionFormSchema } from "@/lib/validations/permission";
import { calculatePlatformFee, generatePermissionNumber } from "@/lib/utils";
import { createNotification } from "@/actions/notifications";
import { extractFormValues } from "@/lib/form-values";
import { getPublicUserWithEmail, getPublicUsersByIds, unknownUser } from "@/lib/users";
import { appendSystemMessage, appendUserMessage } from "@/lib/thread-messages";
import { requireUserId } from "@/lib/auth-helpers";

// ============================================
// 公開クエリ
// ============================================

export async function getMyApplications() {
  const userId = await requireUserId();

  return prisma.palettePermission.findMany({
    where: { applicantId: userId },
    include: {
      play: { select: { id: true, title: true, isFree: true, feeAmount: true } },
      thread: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReceivedApplications(status?: string) {
  const userId = await requireUserId();

  const where: Record<string, unknown> = {
    play: { authorId: userId },
  };
  if (status) where.status = status;

  const permissions = await prisma.palettePermission.findMany({
    where,
    include: {
      play: { select: { id: true, title: true } },
      thread: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const applicantIds = [...new Set(permissions.map((p) => p.applicantId))];
  const applicantMap = await getPublicUsersByIds(applicantIds);

  return permissions.map((p) => ({
    ...p,
    applicant: applicantMap.get(p.applicantId) ?? unknownUser(p.applicantId),
  }));
}

// ============================================
// アクション: 申請作成
// ============================================

export async function createPermission(playId: string, formData: FormData) {
  const userId = await requireUserId();

  const play = await prisma.palettePlay.findUnique({ where: { id: playId } });
  if (!play || !play.isPublished) {
    return { error: "作品が見つかりません" };
  }

  // 同一ユーザーが同一作品で in-flight 申請を持っている場合は防ぐ（UX配慮）
  const active = await prisma.palettePermission.findFirst({
    where: {
      playId,
      applicantId: userId,
      status: { in: ["pending", "approved", "revision_requested"] },
    },
  });
  if (active) {
    return {
      error: "この作品に対する進行中の申請があります。既存の申請スレッドをご確認ください。",
    };
  }

  const parsed = permissionFormSchema.safeParse({
    organizationName: formData.get("organizationName"),
    representativeName: formData.get("representativeName"),
    performanceTitle: formData.get("performanceTitle"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    venueName: formData.get("venueName"),
    venueLocation: formData.get("venueLocation"),
    expectedAudience: formData.get("expectedAudience"),
    ticketType: formData.get("ticketType"),
    numPerformances: formData.get("numPerformances"),
    applicantMessage: formData.get("applicantMessage") || "",
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const first = Object.entries(fieldErrors).find(([, v]) => v && v.length > 0);
    const summary = first
      ? `${first[0]}: ${first[1]![0]}`
      : "入力内容に誤りがあります";
    return { error: summary, fieldErrors, values: extractFormValues(formData) };
  }

  const feeAmount = play.isFree ? 0 : play.feeAmount;
  const platformFee = calculatePlatformFee(feeAmount);
  const applicantMessage = parsed.data.applicantMessage?.trim() || "";

  // permission 作成 + thread 作成 + 送信システムメッセージ + 任意で申請者メッセージ
  const { permission, threadId } = await prisma.$transaction(async (tx) => {
    const permission = await tx.palettePermission.create({
      data: {
        playId,
        applicantId: userId,
        organizationName: parsed.data.organizationName,
        representativeName: parsed.data.representativeName,
        performanceTitle: parsed.data.performanceTitle,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        venueName: parsed.data.venueName,
        venueLocation: parsed.data.venueLocation,
        expectedAudience: parsed.data.expectedAudience,
        ticketType: parsed.data.ticketType,
        numPerformances: parsed.data.numPerformances,
        feeAmount,
        platformFee,
        status: "pending",
      },
    });

    // permission スレッドの participants は applicant + 作家 を sort 順で
    const [p1, p2] = userId < play.authorId
      ? [userId, play.authorId]
      : [play.authorId, userId];

    const thread = await tx.paletteThread.create({
      data: {
        permissionId: permission.id,
        kind: "permission",
        participant1: p1,
        participant2: p2,
        lastMessage: "申請を送信しました",
      },
    });

    await appendSystemMessage(tx, {
      threadId: thread.id,
      kind: "permission_submitted",
      content: "申請を送信しました",
      createdAt: permission.createdAt,
    });

    if (applicantMessage) {
      await appendUserMessage(tx, {
        threadId: thread.id,
        senderId: userId,
        content: applicantMessage,
        createdAt: new Date(permission.createdAt.getTime() + 1),
      });
    }

    return { permission, threadId: thread.id };
  });

  await createNotification({
    userId: play.authorId,
    type: "new_application",
    permissionId: permission.id,
    title: "新しい上演許可申請",
    message: `「${play.title}」に対する上演許可申請が届きました。${parsed.data.organizationName}（${parsed.data.representativeName}）からの申請です。`,
  });

  revalidatePath("/dashboard/permissions");
  revalidatePath("/threads");
  return { success: true, permissionId: permission.id, threadId };
}

// ============================================
// アクション: 承認
// ============================================

/**
 * 作家による申請承認。
 * - 無料案件: 即 permitted、許可証番号発行
 * - 有料案件: approved 状態。payoutBankInfo（振込先）を必ず指定する。
 *   申請者は表示された振込先に直接振込→振込報告→作家確認→許可証発行 の順に進む。
 *   プラットフォームは決済に関与しない（資金移動業の規制回避）。
 */
export async function approvePermission(
  permissionId: string,
  opts: { message?: string; payoutBankInfo?: string } = {}
) {
  const userId = await requireUserId();

  const permission = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    include: { play: true, thread: { select: { id: true } } },
  });
  if (!permission || permission.play.authorId !== userId) {
    return { error: "権限がありません" };
  }
  if (!["pending", "revision_requested"].includes(permission.status)) {
    return { error: "この申請は承認できる状態ではありません" };
  }
  if (!permission.thread) {
    return { error: "スレッドが見つかりません" };
  }

  const isFree = permission.feeAmount === 0;
  const trimmedPayout = opts.payoutBankInfo?.trim() || null;
  if (!isFree && !trimmedPayout) {
    return { error: "有料案件では振込先情報の入力が必須です" };
  }

  const newStatus = isFree ? "permitted" : "approved";
  const permissionNumber = isFree ? generatePermissionNumber() : null;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.palettePermission.update({
      where: { id: permissionId },
      data: {
        status: newStatus,
        reviewedAt: now,
        permissionNumber,
        payoutBankInfo: trimmedPayout,
        transferConfirmedAt: isFree ? now : null,
        expiresAt: isFree ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await appendSystemMessage(tx, {
      threadId: permission.thread!.id,
      kind: "permission_approved",
      content: isFree ? "上演が許可されました" : "申請が承認されました。振込先が提示されました。",
      metadata: {
        permissionNumber,
        feeAmount: permission.feeAmount,
        // 振込先情報をスレッドに残し、後から振り返れるようにする
        payoutBankInfo: trimmedPayout,
      },
      createdAt: now,
    });

    if (opts.message?.trim()) {
      await appendUserMessage(tx, {
        threadId: permission.thread!.id,
        senderId: userId,
        content: opts.message,
        createdAt: new Date(now.getTime() + 1),
      });
    }
  });

  await createNotification({
    userId: permission.applicantId,
    type: "approved",
    permissionId,
    title: isFree ? "上演が許可されました" : "上演許可が承認されました",
    message: isFree
      ? `「${permission.play.title}」の上演が許可されました。許可証をダウンロードできます。`
      : `「${permission.play.title}」の上演許可が承認されました。提示された振込先へ上演料をお振込みください（30日以内）。`,
  });

  revalidatePath("/dashboard/permissions");
  revalidatePath("/threads");
  revalidatePath(`/threads/${permission.thread.id}`);
  return { success: true };
}

/**
 * 申請者が「振込しました」と報告する。status: approved → paid
 */
export async function reportTransfer(permissionId: string) {
  const userId = await requireUserId();

  const permission = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    include: { play: { select: { title: true, authorId: true } }, thread: { select: { id: true } } },
  });
  if (!permission || permission.applicantId !== userId) {
    return { error: "権限がありません" };
  }
  if (permission.status !== "approved") {
    return { error: "この申請は振込報告できる状態ではありません" };
  }
  if (!permission.thread) {
    return { error: "スレッドが見つかりません" };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.palettePermission.update({
      where: { id: permissionId },
      data: { status: "paid", transferReportedAt: now, paidAt: now },
    });

    await appendSystemMessage(tx, {
      threadId: permission.thread!.id,
      kind: "payment_completed",
      content: "申請者が振込完了を報告しました",
      metadata: { feeAmount: permission.feeAmount },
      createdAt: now,
    });
  });

  await createNotification({
    userId: permission.play.authorId,
    type: "payment_completed",
    permissionId,
    title: "振込完了の報告がありました",
    message: `「${permission.play.title}」の上演料について、申請者から振込完了の報告がありました。入金をご確認のうえ、許可証を発行してください。`,
  });

  revalidatePath("/dashboard/permissions");
  revalidatePath("/threads");
  revalidatePath(`/threads/${permission.thread.id}`);
  return { success: true };
}

/**
 * 作家が入金を確認し、許可証を発行する。status: paid → permitted
 * approved 状態から直接 permitted へ進めることも許可（オフライン合意ケース）。
 */
export async function confirmTransfer(permissionId: string, message?: string) {
  const userId = await requireUserId();

  const permission = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    include: { play: true, thread: { select: { id: true } } },
  });
  if (!permission || permission.play.authorId !== userId) {
    return { error: "権限がありません" };
  }
  if (!["paid", "approved"].includes(permission.status)) {
    return { error: "この申請は許可証発行できる状態ではありません" };
  }
  if (!permission.thread) {
    return { error: "スレッドが見つかりません" };
  }

  const now = new Date();
  const permissionNumber = generatePermissionNumber();

  await prisma.$transaction(async (tx) => {
    await tx.palettePermission.update({
      where: { id: permissionId },
      data: {
        status: "permitted",
        permissionNumber,
        transferConfirmedAt: now,
        paidAt: permission.paidAt ?? now,
      },
    });

    await appendSystemMessage(tx, {
      threadId: permission.thread!.id,
      kind: "payment_completed",
      content: "入金が確認され、許可証が発行されました",
      metadata: { permissionNumber, feeAmount: permission.feeAmount },
      createdAt: now,
    });

    if (message?.trim()) {
      await appendUserMessage(tx, {
        threadId: permission.thread!.id,
        senderId: userId,
        content: message,
        createdAt: new Date(now.getTime() + 1),
      });
    }
  });

  await createNotification({
    userId: permission.applicantId,
    type: "payment_completed",
    permissionId,
    title: "上演が許可されました",
    message: `「${permission.play.title}」の入金が確認され、正式に上演が許可されました。許可証をダウンロードできます。`,
  });

  revalidatePath("/dashboard/permissions");
  revalidatePath("/threads");
  revalidatePath(`/threads/${permission.thread.id}`);
  return { success: true };
}

// ============================================
// アクション: 却下
// ============================================

export async function rejectPermission(permissionId: string, reason: string, message?: string) {
  const userId = await requireUserId();

  const trimmedReason = reason.trim();
  if (!trimmedReason) return { error: "却下理由を入力してください" };

  const permission = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    include: { play: true, thread: { select: { id: true } } },
  });
  if (!permission || permission.play.authorId !== userId) {
    return { error: "権限がありません" };
  }
  if (!["pending", "revision_requested"].includes(permission.status)) {
    return { error: "この申請は却下できる状態ではありません" };
  }
  if (!permission.thread) return { error: "スレッドが見つかりません" };

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.palettePermission.update({
      where: { id: permissionId },
      data: {
        status: "rejected",
        rejectionReason: trimmedReason,
        reviewedAt: now,
      },
    });

    await appendSystemMessage(tx, {
      threadId: permission.thread!.id,
      kind: "permission_rejected",
      content: "申請が却下されました",
      metadata: { reason: trimmedReason },
      createdAt: now,
    });

    if (message?.trim()) {
      await appendUserMessage(tx, {
        threadId: permission.thread!.id,
        senderId: userId,
        content: message,
        createdAt: new Date(now.getTime() + 1),
      });
    }
  });

  await createNotification({
    userId: permission.applicantId,
    type: "rejected",
    permissionId,
    title: "上演許可が却下されました",
    message: `「${permission.play.title}」の上演許可申請が却下されました。理由: ${trimmedReason}`,
  });

  revalidatePath("/dashboard/permissions");
  revalidatePath("/threads");
  revalidatePath(`/threads/${permission.thread.id}`);
  return { success: true };
}

// ============================================
// アクション: 修正依頼（作家）
// ============================================

export async function requestRevision(
  permissionId: string,
  reason: string,
  message?: string
) {
  const userId = await requireUserId();

  const trimmedReason = reason.trim();
  if (!trimmedReason) return { error: "修正依頼の理由を入力してください" };

  const permission = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    include: { play: true, thread: { select: { id: true } } },
  });
  if (!permission || permission.play.authorId !== userId) {
    return { error: "権限がありません" };
  }
  if (permission.status !== "pending") {
    return { error: "この申請は修正依頼できる状態ではありません" };
  }
  if (!permission.thread) return { error: "スレッドが見つかりません" };

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.palettePermission.update({
      where: { id: permissionId },
      data: {
        status: "revision_requested",
        revisionReason: trimmedReason,
        reviewedAt: now,
      },
    });

    await appendSystemMessage(tx, {
      threadId: permission.thread!.id,
      kind: "revision_requested",
      content: "修正を依頼しました",
      metadata: { reason: trimmedReason },
      createdAt: now,
    });

    if (message?.trim()) {
      await appendUserMessage(tx, {
        threadId: permission.thread!.id,
        senderId: userId,
        content: message,
        createdAt: new Date(now.getTime() + 1),
      });
    }
  });

  await createNotification({
    userId: permission.applicantId,
    type: "revision_requested",
    permissionId,
    title: "申請の修正依頼が届きました",
    message: `「${permission.play.title}」の申請内容について修正依頼が届きました。理由: ${trimmedReason}`,
  });

  revalidatePath("/dashboard/permissions");
  revalidatePath("/threads");
  revalidatePath(`/threads/${permission.thread.id}`);
  return { success: true };
}

// ============================================
// アクション: 再提出（申請者）
// ============================================

export async function resubmitPermission(
  permissionId: string,
  formData: FormData
) {
  const userId = await requireUserId();

  const permission = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    include: { play: true, thread: { select: { id: true } } },
  });
  if (!permission || permission.applicantId !== userId) {
    return { error: "権限がありません" };
  }
  if (permission.status !== "revision_requested") {
    return { error: "この申請は再提出できる状態ではありません" };
  }
  if (!permission.thread) return { error: "スレッドが見つかりません" };

  const parsed = permissionFormSchema.safeParse({
    organizationName: formData.get("organizationName"),
    representativeName: formData.get("representativeName"),
    performanceTitle: formData.get("performanceTitle"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    venueName: formData.get("venueName"),
    venueLocation: formData.get("venueLocation"),
    expectedAudience: formData.get("expectedAudience"),
    ticketType: formData.get("ticketType"),
    numPerformances: formData.get("numPerformances"),
    applicantMessage: formData.get("applicantMessage") || "",
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const first = Object.entries(fieldErrors).find(([, v]) => v && v.length > 0);
    const summary = first
      ? `${first[0]}: ${first[1]![0]}`
      : "入力内容に誤りがあります";
    return {
      error: summary,
      fieldErrors,
      values: extractFormValues(formData),
    };
  }

  const applicantMessage = parsed.data.applicantMessage?.trim() || "";
  const now = new Date();
  const threadId = permission.thread.id;

  await prisma.$transaction(async (tx) => {
    await tx.palettePermission.update({
      where: { id: permissionId },
      data: {
        organizationName: parsed.data.organizationName,
        representativeName: parsed.data.representativeName,
        performanceTitle: parsed.data.performanceTitle,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
        venueName: parsed.data.venueName,
        venueLocation: parsed.data.venueLocation,
        expectedAudience: parsed.data.expectedAudience,
        ticketType: parsed.data.ticketType,
        numPerformances: parsed.data.numPerformances,
        status: "pending",
        // revisionReason は履歴として残す（次の修正依頼で上書きされる）
      },
    });

    await appendSystemMessage(tx, {
      threadId,
      kind: "permission_resubmitted",
      content: "修正版を提出しました",
      createdAt: now,
    });

    if (applicantMessage) {
      await appendUserMessage(tx, {
        threadId,
        senderId: userId,
        content: applicantMessage,
        createdAt: new Date(now.getTime() + 1),
      });
    }
  });

  await createNotification({
    userId: permission.play.authorId,
    type: "new_application",
    permissionId,
    title: "申請の修正版が提出されました",
    message: `「${permission.play.title}」の申請が修正されて再提出されました。`,
  });

  revalidatePath("/dashboard/permissions");
  revalidatePath("/threads");
  revalidatePath(`/threads/${threadId}`);
  return { success: true, threadId };
}

// ============================================
// アクション: 取り下げ（申請者）
// ============================================

export async function withdrawPermission(permissionId: string, reason?: string) {
  const userId = await requireUserId();

  const permission = await prisma.palettePermission.findUnique({
    where: { id: permissionId },
    include: { play: true, thread: { select: { id: true } } },
  });
  if (!permission || permission.applicantId !== userId) {
    return { error: "権限がありません" };
  }
  if (
    !["pending", "approved", "revision_requested"].includes(permission.status)
  ) {
    return { error: "この申請は取り下げできる状態ではありません" };
  }
  if (!permission.thread) return { error: "スレッドが見つかりません" };

  const now = new Date();
  const trimmedReason = reason?.trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.palettePermission.update({
      where: { id: permissionId },
      data: {
        status: "withdrawn",
        withdrawnAt: now,
        withdrawnReason: trimmedReason,
      },
    });

    await appendSystemMessage(tx, {
      threadId: permission.thread!.id,
      kind: "permission_withdrawn",
      content: "申請を取り下げました",
      metadata: trimmedReason ? { reason: trimmedReason } : undefined,
      createdAt: now,
    });
  });

  await createNotification({
    userId: permission.play.authorId,
    type: "permission_withdrawn",
    permissionId,
    title: "申請が取り下げられました",
    message: `「${permission.play.title}」の上演許可申請が申請者により取り下げられました。`,
  });

  revalidatePath("/dashboard/permissions");
  revalidatePath("/threads");
  revalidatePath(`/threads/${permission.thread.id}`);
  return { success: true };
}

// ============================================
// 汎用参照（既存ページで使用）
// ============================================

export async function getPermissionById(id: string) {
  const userId = await requireUserId();

  const permission = await prisma.palettePermission.findUnique({
    where: { id },
    include: { play: true, thread: { select: { id: true } } },
  });
  if (!permission) return null;

  if (permission.applicantId !== userId && permission.play.authorId !== userId) {
    return null;
  }

  const [author, applicant] = await Promise.all([
    getPublicUserWithEmail(permission.play.authorId),
    getPublicUserWithEmail(permission.applicantId),
  ]);

  return {
    ...permission,
    play: { ...permission.play, author },
    applicant,
    currentUserId: userId,
  };
}

