"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/actions/notifications";
import type {
  ThreadDetail,
  ThreadSummary,
  ThreadMessage,
  AttachmentSummary,
  PermissionInThread,
} from "@/types/thread";
import type { PermissionStatus, SystemMessageKind } from "@/types";

const MESSAGE_MAX_LENGTH = 2000;

type UserRow = {
  id: string;
  name: string | null;
  displayName: string | null;
  image: string | null;
  avatarUrl: string | null;
  email: string | null;
};

async function fetchUsersByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, UserRow>();
  const rows = await prisma.$queryRaw<UserRow[]>`
    SELECT id, name, "displayName", image, "avatarUrl", email
    FROM "User" WHERE id = ANY(${ids})
  `;
  return new Map(rows.map((r) => [r.id, r]));
}

function userToThreadUser(u: UserRow | undefined, fallbackId: string) {
  return {
    id: u?.id ?? fallbackId,
    name: u?.displayName || u?.name || "ユーザー",
    image: u?.avatarUrl || u?.image || null,
  };
}

function summarizeForPreview(content: string, max = 100): string {
  return content.length > max ? content.slice(0, max) : content;
}

/** participant1 / participant2 を sort して返す（inquiry スレッドの一意性確保） */
function sortPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * 現在のユーザーが参加する全スレッドの一覧。
 * permission スレッドと inquiry スレッドの両方を含む。
 */
export async function getMyThreads(): Promise<ThreadSummary[]> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const threads = await prisma.paletteThread.findMany({
    where: {
      OR: [{ participant1: userId }, { participant2: userId }],
    },
    include: {
      permission: {
        include: {
          play: { select: { id: true, title: true, coverImageUrl: true, authorId: true } },
        },
      },
    },
    orderBy: { lastAt: "desc" },
    take: 100,
  });

  const otherIds = Array.from(
    new Set(threads.map((t) => (t.participant1 === userId ? t.participant2 : t.participant1)))
  );
  const userMap = await fetchUsersByIds(otherIds);

  const threadIds = threads.map((t) => t.id);
  const unreadCounts =
    threadIds.length === 0
      ? []
      : await prisma.paletteMessage.groupBy({
          by: ["threadId"],
          where: {
            threadId: { in: threadIds },
            readAt: null,
            NOT: { senderId: userId },
            type: "text",
          },
          _count: true,
        });
  const unreadMap = new Map(unreadCounts.map((u) => [u.threadId, u._count]));

  return threads.map<ThreadSummary>((t) => {
    const otherId = t.participant1 === userId ? t.participant2 : t.participant1;
    const other = userToThreadUser(userMap.get(otherId), otherId);

    if (t.kind === "permission" && t.permission) {
      const isAuthor = t.permission.play.authorId === userId;
      return {
        id: t.id,
        kind: "permission",
        permission: {
          id: t.permission.id,
          status: t.permission.status as PermissionStatus,
          feeAmount: t.permission.feeAmount,
        },
        play: {
          id: t.permission.play.id,
          title: t.permission.play.title,
          coverImageUrl: t.permission.play.coverImageUrl,
        },
        other,
        role: isAuthor ? "author" : "applicant",
        lastMessage: t.lastMessage,
        lastAt: t.lastAt.toISOString(),
        unread: unreadMap.get(t.id) ?? 0,
      };
    }

    // inquiry kind
    return {
      id: t.id,
      kind: "inquiry",
      permission: null,
      play: null,
      other,
      role: null,
      lastMessage: t.lastMessage,
      lastAt: t.lastAt.toISOString(),
      unread: unreadMap.get(t.id) ?? 0,
    };
  });
}

/**
 * スレッド詳細を取得。認可チェック（参加者のみ）。
 * 自分宛未読は既読化。
 */
export async function getThreadDetail(threadId: string): Promise<ThreadDetail | null> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const thread = await prisma.paletteThread.findUnique({
    where: { id: threadId },
    include: {
      permission: {
        include: {
          play: { select: { id: true, title: true, coverImageUrl: true, authorId: true } },
          attachments: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { attachments: true },
      },
    },
  });
  if (!thread) return null;

  const isParticipant =
    thread.participant1 === userId || thread.participant2 === userId;
  if (!isParticipant) return null;

  const otherId = thread.participant1 === userId ? thread.participant2 : thread.participant1;
  const userMap = await fetchUsersByIds([otherId]);
  const other = userToThreadUser(userMap.get(otherId), otherId);

  // 自分宛未読を既読マーク
  await prisma.paletteMessage.updateMany({
    where: {
      threadId,
      readAt: null,
      NOT: { senderId: userId },
      type: "text",
    },
    data: { readAt: new Date() },
  });

  const messages = thread.messages.map<ThreadMessage>((m) => ({
    id: m.id,
    type: m.type as "text" | "system",
    senderId: m.senderId,
    isMine: m.senderId === userId,
    content: m.content,
    metadata: (m.metadata as Record<string, unknown> | null) ?? null,
    kind: ((m.metadata as { kind?: SystemMessageKind } | null)?.kind ?? null) as SystemMessageKind | null,
    attachments: m.attachments.map(toAttachmentSummary),
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  }));

  if (thread.kind === "permission" && thread.permission) {
    const isAuthor = thread.permission.play.authorId === userId;
    const stripeAccount = await prisma.paletteStripeAccount.findUnique({
      where: { userId: thread.permission.play.authorId },
      select: { onboardingCompleted: true },
    });
    const permission: PermissionInThread = {
      id: thread.permission.id,
      status: thread.permission.status as PermissionStatus,
      organizationName: thread.permission.organizationName,
      representativeName: thread.permission.representativeName,
      performanceTitle: thread.permission.performanceTitle,
      startDate: thread.permission.startDate.toISOString(),
      endDate: thread.permission.endDate.toISOString(),
      venueName: thread.permission.venueName,
      venueLocation: thread.permission.venueLocation,
      expectedAudience: thread.permission.expectedAudience,
      ticketType: thread.permission.ticketType as "free" | "paid",
      numPerformances: thread.permission.numPerformances,
      feeAmount: thread.permission.feeAmount,
      platformFee: thread.permission.platformFee,
      permissionNumber: thread.permission.permissionNumber,
      rejectionReason: thread.permission.rejectionReason,
      revisionReason: thread.permission.revisionReason,
      withdrawnReason: thread.permission.withdrawnReason,
      paidAt: thread.permission.paidAt?.toISOString() ?? null,
      expiresAt: thread.permission.expiresAt?.toISOString() ?? null,
    };
    return {
      id: thread.id,
      kind: "permission",
      role: isAuthor ? "author" : "applicant",
      other,
      play: {
        id: thread.permission.play.id,
        title: thread.permission.play.title,
        coverImageUrl: thread.permission.play.coverImageUrl,
      },
      permission,
      authorStripeReady: !!stripeAccount?.onboardingCompleted,
      attachments: thread.permission.attachments.map(toAttachmentSummary),
      messages,
    };
  }

  // inquiry
  return {
    id: thread.id,
    kind: "inquiry",
    role: null,
    other,
    play: null,
    permission: null,
    authorStripeReady: null,
    attachments: [],
    messages,
  };
}

function toAttachmentSummary(a: {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploaderId: string;
  createdAt: Date;
}): AttachmentSummary {
  return {
    id: a.id,
    fileName: a.fileName,
    fileSize: a.fileSize,
    mimeType: a.mimeType,
    uploaderId: a.uploaderId,
    createdAt: a.createdAt.toISOString(),
  };
}

/** メッセージ送信。attachmentIds を渡すと、未紐付けの添付を新メッセージに連結する。 */
export async function sendMessage(
  threadId: string,
  content: string,
  attachmentIds: string[] = []
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const trimmed = content.trim();
  if (!trimmed && attachmentIds.length === 0) {
    return { error: "メッセージまたはファイルを入力してください" };
  }
  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    return { error: `メッセージは${MESSAGE_MAX_LENGTH}文字以内です` };
  }

  const thread = await prisma.paletteThread.findUnique({
    where: { id: threadId },
    include: {
      permission: { include: { play: { select: { authorId: true, title: true } } } },
    },
  });
  if (!thread) return { error: "スレッドが見つかりません" };

  const isParticipant =
    thread.participant1 === userId || thread.participant2 === userId;
  if (!isParticipant) return { error: "権限がありません" };

  // permission スレッドの終了状態では送信不可
  if (
    thread.permission &&
    ["rejected", "withdrawn", "expired"].includes(thread.permission.status)
  ) {
    return { error: "このスレッドは終了しています" };
  }

  // 添付IDの所有者チェック
  if (attachmentIds.length > 0) {
    const attachments = await prisma.paletteAttachment.findMany({
      where: { id: { in: attachmentIds } },
    });
    const invalid = attachments.find(
      (a) => a.uploaderId !== userId || a.messageId || a.permissionId
    );
    if (invalid || attachments.length !== attachmentIds.length) {
      return { error: "添付ファイルの権限が不正です" };
    }
  }

  const preview = trimmed
    ? summarizeForPreview(trimmed)
    : `📎 添付ファイル ${attachmentIds.length}件`;

  await prisma.$transaction(async (tx) => {
    const message = await tx.paletteMessage.create({
      data: {
        threadId,
        senderId: userId,
        type: "text",
        content: trimmed || "",
      },
    });
    if (attachmentIds.length > 0) {
      await tx.paletteAttachment.updateMany({
        where: { id: { in: attachmentIds } },
        data: { messageId: message.id },
      });
    }
    await tx.paletteThread.update({
      where: { id: threadId },
      data: { lastMessage: preview, lastAt: new Date() },
    });
  });

  const recipientId =
    thread.participant1 === userId ? thread.participant2 : thread.participant1;

  if (thread.kind === "permission" && thread.permission) {
    await createNotification({
      userId: recipientId,
      type: "new_message",
      permissionId: thread.permission.id,
      title: "新しいメッセージ",
      message: `「${thread.permission.play.title}」のスレッドに新しいメッセージがあります`,
      coalesce: true,
    });
  } else {
    // inquiry スレッドは permissionId を持たないため、
    // notification 側の coalesce キーは type+userId でしか効かない点に注意
    await createNotification({
      userId: recipientId,
      type: "new_message",
      title: "新しいメッセージ",
      message: "問い合わせスレッドに新しいメッセージがあります",
    });
  }

  revalidatePath(`/threads/${threadId}`);
  return { success: true };
}

/**
 * inquiry スレッドの取得 or 作成。
 * 自分と相手で 1:1 の問い合わせチャネルを開く。
 */
export async function openInquiryThread(otherUserId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  if (otherUserId === userId) {
    return { error: "自分自身にはメッセージを送れません" };
  }

  // 相手ユーザー存在確認（共有 User テーブル参照）
  const others = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "User" WHERE id = ${otherUserId}
  `;
  if (others.length === 0) return { error: "ユーザーが見つかりません" };

  const [p1, p2] = sortPair(userId, otherUserId);

  const existing = await prisma.paletteThread.findFirst({
    where: { kind: "inquiry", participant1: p1, participant2: p2 },
  });
  if (existing) {
    return { success: true, threadId: existing.id, created: false };
  }

  const thread = await prisma.paletteThread.create({
    data: {
      kind: "inquiry",
      participant1: p1,
      participant2: p2,
    },
  });

  return { success: true, threadId: thread.id, created: true };
}
