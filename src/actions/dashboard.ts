"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function getDashboardSummary() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [publishedPlays, totalViews, pendingApplications, monthlyRevenue] =
    await Promise.all([
      prisma.palettePlay.count({
        where: { authorId: session.user.id, isPublished: true },
      }),
      prisma.palettePlay.aggregate({
        where: { authorId: session.user.id },
        _sum: { viewCount: true },
      }),
      prisma.palettePermission.count({
        where: { play: { authorId: session.user.id }, status: "pending" },
      }),
      prisma.palettePayment.aggregate({
        where: {
          permission: { play: { authorId: session.user.id } },
          status: "completed",
          completedAt: { gte: startOfMonth },
        },
        _sum: { authorAmount: true },
      }),
    ]);

  return {
    publishedPlays,
    totalViews: totalViews._sum.viewCount || 0,
    pendingApplications,
    monthlyRevenue: monthlyRevenue._sum.authorAmount || 0,
  };
}

export async function getSalesSummary() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const payments = await prisma.palettePayment.findMany({
    where: {
      permission: { play: { authorId: session.user.id } },
      status: "completed",
    },
    include: {
      permission: {
        include: {
          play: { select: { title: true } },
        },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  const totalRevenue = payments.reduce((sum, p) => sum + p.authorAmount, 0);
  const totalFees = payments.reduce((sum, p) => sum + p.platformFee, 0);

  return { payments, totalRevenue, totalFees };
}
