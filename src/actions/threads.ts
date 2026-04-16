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
} from "@/types/thread";
import type { PermissionStatus, SystemMessageKind, ThreadRole } from "@/types";

const MESSAGE_MAX_LENGTH = 2000;

/** 指定 id の参加者情報（作家・申請者）を1クエリで取得 */
async function fetchUsersByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, { id: string; name: string | null; displayName: string | null; image: string | null; avatarUrl: string | null; email: string | null }>();
  const rows = await prisma.$queryRaw<Array<{ id: string; name: string | null; displayName: string | null; image: string | null; avatarUrl: string | null; email: string | null }>>`
    SELECT id, name, "displayName", image, "avatarUrl", email
    FROM "User" WHERE id = ANY(${ids})
  `;
  return new Map(rows.map((r) => [r.id, r]));
}

function userToThread(u: { id: string; name: string | null; displayName: string | null; image: string | null; avatarUrl: string | null } | undefined, fallbackId: string) {
  return {
    id: u?.id ?? fallbackId,
    name: u?.displayName || u?.name || "ユーザー",
    image: u?.avatarUrl || u?.image || null,
  };
}

function summarizeForPreview(content: string, max = 100): string {
  return content.length > max ? content.slice(0, max) : content;
}

/**
 * 現在のユーザーが参加する全スレッドの一覧。
 * 作家視点（自作品への申請スレッド）と申請者視点（自分が出した申請のスレッド）の両方を含む。
 */
export async function getMyThreads(): Promise<ThreadSummary[]> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // permission経由でスレッドを引く（作家 or 申請者）
  const threads = await prisma.paletteThread.findMany({
    where: {
      OR: [
        { permission: { applicantId: userId } },
        { permission: { play: { authorId: userId } } },
      ],
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
    new Set(
      threads.map((t) =>
        t.permission.applicantId === userId
          ? t.permission.play.authorId
          : t.permission.applicantId
      )
    )
  );
  const userMap = await fetchUsersByIds(otherIds);

  // 未読数（自分宛のメッセージのうち read_at が null で、自分が送信者ではないもの）
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
            // system messageは既読管理の対象外にする（senderId=null なので上のNOTでは除外されない）
            type: "text",
          },
          _count: true,
        });
  const unreadMap = new Map(unreadCounts.map((u) => [u.threadId, u._count]));

  return threads.map<ThreadSummary>((t) => {
    const isAuthor = t.permission.play.authorId === userId;
    const otherId = isAuthor ? t.permission.applicantId : t.permission.play.authorId;
    const other = userToThread(userMap.get(otherId), otherId);
    return {
      id: t.id,
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
  });
}

/**
 * スレッド詳細を取得。認可チェック（作家 or 申請者のみ）。
 * 未読メッセージは既読マーク。
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

  const isAuthor = thread.permission.play.authorId === userId;
  const isApplicant = thread.permission.applicantId === userId;
  if (!isAuthor && !isApplicant) return null;

  const otherId = isAuthor ? thread.permission.applicantId : thread.permission.play.authorId;
  const userMap = await fetchUsersByIds([otherId]);
  const other = userToThread(userMap.get(otherId), otherId);

  // 自分宛未読を既読マーク（自分が送っていない text messages のみ）
  await prisma.paletteMessage.updateMany({
    where: {
      threadId,
      readAt: null,
      NOT: { senderId: userId },
      type: "text",
    },
    data: { readAt: new Date() },
  });

  return {
    id: thread.id,
    role: isAuthor ? "author" : "applicant",
    other,
    play: {
      id: thread.permission.play.id,
      title: thread.permission.play.title,
      coverImageUrl: thread.permission.play.coverImageUrl,
    },
    permission: {
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
    },
    attachments: thread.permission.attachments.map(toAttachmentSummary),
    messages: thread.messages.map<ThreadMessage>((m) => ({
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
    })),
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

/** メッセージ送信 */
export async function sendMessage(threadId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const trimmed = content.trim();
  if (!trimmed) return { error: "メッセージを入力してください" };
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

  const isAuthor = thread.permission.play.authorId === userId;
  const isApplicant = thread.permission.applicantId === userId;
  if (!isAuthor && !isApplicant) return { error: "権限がありません" };

  // 終了状態ではメッセージ送信不可
  if (["rejected", "withdrawn", "expired"].includes(thread.permission.status)) {
    return { error: "このスレッドは終了しています" };
  }

  const preview = summarizeForPreview(trimmed);

  await prisma.$transaction([
    prisma.paletteMessage.create({
      data: {
        threadId,
        senderId: userId,
        type: "text",
        content: trimmed,
      },
    }),
    prisma.paletteThread.update({
      where: { id: threadId },
      data: { lastMessage: preview, lastAt: new Date() },
    }),
  ]);

  // 相手に通知（アプリ内）
  const recipientId = isAuthor ? thread.permission.applicantId : thread.permission.play.authorId;
  await createNotification({
    userId: recipientId,
    type: "new_message",
    permissionId: thread.permission.id,
    title: "新しいメッセージ",
    message: `「${thread.permission.play.title}」のスレッドに新しいメッセージがあります`,
  });

  revalidatePath(`/threads/${threadId}`);
  return { success: true };
}
