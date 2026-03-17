"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

export async function getDashboardSummary() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [publishedPlays, totalViews, pendingApplications, monthlyRevenue] =
    await Promise.all([
      prisma.play.count({
        where: { authorId: user.id, isPublished: true },
      }),
      prisma.play.aggregate({
        where: { authorId: user.id },
        _sum: { viewCount: true },
      }),
      prisma.performancePermission.count({
        where: { play: { authorId: user.id }, status: "pending" },
      }),
      prisma.payment.aggregate({
        where: {
          permission: { play: { authorId: user.id } },
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const payments = await prisma.payment.findMany({
    where: {
      permission: { play: { authorId: user.id } },
      status: "completed",
    },
    include: {
      permission: {
        include: {
          play: { select: { title: true } },
          applicant: { select: { displayName: true } },
        },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  const totalRevenue = payments.reduce((sum, p) => sum + p.authorAmount, 0);
  const totalFees = payments.reduce((sum, p) => sum + p.platformFee, 0);

  return { payments, totalRevenue, totalFees };
}
