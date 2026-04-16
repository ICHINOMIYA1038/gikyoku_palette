"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type CreateNotificationParams = {
  userId: string;
  type: string;
  permissionId?: string;
  title: string;
  message: string;
  /**
   * true の場合、同一 (userId, type, permissionId) で
   * coalesceWindowMs 以内 / かつ未読の通知が既にあれば
   * 新規作成せず既存を更新（タイムスタンプ更新のみ）。
   */
  coalesce?: boolean;
  coalesceWindowMs?: number;
};

const DEFAULT_COALESCE_WINDOW_MS = 5 * 60 * 1000;

export async function createNotification(params: CreateNotificationParams) {
  // 集約モード: 連投中のメッセージ通知などで通知爆発を防ぐ
  if (params.coalesce && params.permissionId) {
    const since = new Date(
      Date.now() - (params.coalesceWindowMs ?? DEFAULT_COALESCE_WINDOW_MS)
    );
    const existing = await prisma.paletteNotification.findFirst({
      where: {
        userId: params.userId,
        type: params.type,
        permissionId: params.permissionId,
        isRead: false,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      // 同種の未読通知がまだ新しい間は、本文だけ最新に差し替えてタイムスタンプ更新
      await prisma.paletteNotification.update({
        where: { id: existing.id },
        data: {
          title: params.title,
          message: params.message,
          createdAt: new Date(), // 一覧で最新に並ぶ
        },
      });
      return;
    }
  }

  await prisma.paletteNotification.create({
    data: {
      userId: params.userId,
      type: params.type,
      permissionId: params.permissionId || null,
      title: params.title,
      message: params.message,
    },
  });
}

/**
 * 自分宛の通知を取得。permissionId からスレッドID を解決し、
 * 一覧 UI で /threads/{threadId} に直リンクできるようにして返す。
 */
export async function getNotifications() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const notifications = await prisma.paletteNotification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // permissionId → threadId の一括解決
  const permissionIds = Array.from(
    new Set(notifications.map((n) => n.permissionId).filter((id): id is string => !!id))
  );
  const threads =
    permissionIds.length > 0
      ? await prisma.paletteThread.findMany({
          where: { permissionId: { in: permissionIds } },
          select: { id: true, permissionId: true },
        })
      : [];
  const threadByPerm = new Map(threads.map((t) => [t.permissionId, t.id]));

  return notifications.map((n) => ({
    ...n,
    threadId: n.permissionId ? threadByPerm.get(n.permissionId) ?? null : null,
  }));
}

export async function markAsRead(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.paletteNotification.updateMany({
    where: { id: notificationId, userId: session.user.id },
    data: { isRead: true },
  });
}

export async function markAllAsRead() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await prisma.paletteNotification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });
}

export async function getUnreadCount() {
  const session = await auth();
  if (!session?.user?.id) return 0;

  return prisma.paletteNotification.count({
    where: { userId: session.user.id, isRead: false },
  });
}
