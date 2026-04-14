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
};

export async function createNotification(params: CreateNotificationParams) {
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

export async function getNotifications() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return prisma.paletteNotification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
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
