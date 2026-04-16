"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { permissionFormSchema } from "@/lib/validations/permission";
import { calculatePlatformFee, generatePermissionNumber } from "@/lib/utils";
import { createNotification } from "@/actions/notifications";
import type { Prisma } from "@prisma/client";
import type { SystemMessageKind } from "@/types";

// User情報をraw queryで取得するヘルパー
async function getUserById(id: string) {
  const users = await prisma.$queryRaw<
    Array<{ id: string; name: string | null; displayName: string | null; avatarUrl: string | null; email: string | null }>
  >`
    SELECT id, name, "displayName", "avatarUrl", email FROM "User" WHERE id = ${id}
  `;
  return users[0] || null;
}

async function getUsersByIds(ids: string[]) {
  if (ids.length === 0) return new Map();
  const users = await prisma.$queryRaw<
    Array<{ id: string; name: string | null; displayName: string | null; avatarUrl: string | null }>
  >`
    SELECT id, name, "displayName", "avatarUrl" FROM "User" WHERE id = ANY(${ids})
  `;
  return new Map(users.map((u) => [u.id, u]));
}

/**
 * スレッドにシステムメッセージを追加し、thread.lastMessage/lastAt を更新する。
 * 呼び出し側のトランザクションに参加する形で使う。
 */
async function appendSystemMessage(
  tx: Prisma.TransactionClient,
  params: {
    threadId: string;
    kind: SystemMessageKind;
    content: string;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
  }
) {
  const createdAt = params.createdAt ?? new Date();
  await tx.paletteMessage.create({
    data: {
      threadId: params.threadId,
      senderId: null,
      type: "system",
      content: params.content,
      metadata: { kind: params.kind, ...(params.metadata ?? {}) },
      createdAt,
    },
  });
  await tx.paletteThread.update({
    where: { id: params.threadId },
    data: { lastMessage: params.content, lastAt: createdAt },
  });
}

/**
 * スレッドにユーザーメッセージを追加し、thread.lastMessage/lastAt を更新する。
 */
async function appendUserMessage(
  tx: Prisma.TransactionClient,
  params: {
    threadId: string;
    senderId: string;
    content: string;
    createdAt?: Date;
  }
) {
  const createdAt = params.createdAt ?? new Date();
  const trimmed = params.content.trim();
  if (!trimmed) return;
  await tx.paletteMessage.create({
    data: {
      threadId: params.threadId,
      senderId: params.senderId,
      type: "text",
      content: trimmed,
      createdAt,
    },
  });
  await tx.paletteThread.update({
    where: { id: params.threadId },
    data: {
      lastMessage: trimmed.length > 100 ? trimmed.slice(0, 100) : trimmed,
      lastAt: createdAt,
    },
  });
}

// ============================================
// 公開クエリ
// ============================================

export async function getMyApplications() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return prisma.palettePermission.findMany({
    where: { applicantId: session.user.id },
    include: {
      play: { select: { id: true, title: true, isFree: true, feeAmount: true } },
      thread: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReceivedApplications(status?: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const where: Record<string, unknown> = {
    play: { authorId: session.user.id },
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
  const applicantMap = await getUsersByIds(applicantIds);

  return permissions.map((p) => ({
    ...p,
    applicant: applicantMap.get(p.applicantId) || { id: p.applicantId, displayName: "不明" },
  }));
}

// ============================================
// アクション: 申請作成
// ============================================

export async function createPermission(playId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId: string = session.user.id;

  const play = await prisma.palettePlay.findUnique({ where: { id: playId } });
  if (!play || !play.isPublished) {
    return { error: "作品が見つかりません" };
  }

  // 同一ユーザーが同一作品で in-flight 申請を持っている場合は防ぐ（UX配慮）
  const active = await prisma.palettePermission.findFirst({
    where: {
      playId,
      applicantId: session.user.id,
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
    return { error: "入力内容に誤りがあります", fieldErrors: parsed.error.flatten().fieldErrors };
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

    const thread = await tx.paletteThread.create({
      data: { permissionId: permission.id, lastMessage: "申請を送信しました" },
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

export async function approvePermission(permissionId: string, message?: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId: string = session.user.id;

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
    // 正常系なら必ずスレッドがあるが、念のため
    return { error: "スレッドが見つかりません" };
  }

  const isFree = permission.feeAmount === 0;
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
        expiresAt: isFree ? null : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await appendSystemMessage(tx, {
      threadId: permission.thread!.id,
      kind: "permission_approved",
      content: isFree ? "上演が許可されました" : "申請が承認されました",
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
    type: "approved",
    permissionId,
    title: isFree ? "上演が許可されました" : "上演許可が承認されました",
    message: isFree
      ? `「${permission.play.title}」の上演が許可されました。許可証をダウンロードできます。`
      : `「${permission.play.title}」の上演許可が承認されました。上演料の決済を行ってください（30日以内）。`,
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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId: string = session.user.id;

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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId: string = session.user.id;

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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId: string = session.user.id;

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
    return {
      error: "入力内容に誤りがあります",
      fieldErrors: parsed.error.flatten().fieldErrors,
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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId: string = session.user.id;

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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const permission = await prisma.palettePermission.findUnique({
    where: { id },
    include: { play: true, payment: true, thread: { select: { id: true } } },
  });
  if (!permission) return null;

  if (permission.applicantId !== session.user.id && permission.play.authorId !== session.user.id) {
    return null;
  }

  const [author, applicant] = await Promise.all([
    getUserById(permission.play.authorId),
    getUserById(permission.applicantId),
  ]);

  return {
    ...permission,
    play: { ...permission.play, author },
    applicant,
    currentUserId: session.user.id,
  };
}

