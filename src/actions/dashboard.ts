"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function getDashboardSummary() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    publishedPlays,
    totalViews,
    pendingApplications,
    monthlyRevenue,
    paidPublishedCount,
    stripeAccount,
  ] = await Promise.all([
    prisma.palettePlay.count({
      where: { authorId: userId, isPublished: true },
    }),
    prisma.palettePlay.aggregate({
      where: { authorId: userId },
      _sum: { viewCount: true },
    }),
    prisma.palettePermission.count({
      where: { play: { authorId: userId }, status: "pending" },
    }),
    prisma.palettePayment.aggregate({
      where: {
        permission: { play: { authorId: userId } },
        status: "completed",
        completedAt: { gte: startOfMonth },
      },
      _sum: { authorAmount: true },
    }),
    // 有料 (isFree=false かつ feeAmount>0) で公開中の作品数
    prisma.palettePlay.count({
      where: {
        authorId: userId,
        isPublished: true,
        isFree: false,
        feeAmount: { gt: 0 },
      },
    }),
    prisma.paletteStripeAccount.findUnique({
      where: { userId },
      select: { onboardingCompleted: true },
    }),
  ]);

  return {
    publishedPlays,
    totalViews: totalViews._sum.viewCount || 0,
    pendingApplications,
    monthlyRevenue: monthlyRevenue._sum.authorAmount || 0,
    /** 有料公開中作品数。stripe 未設定で >0 なら警告対象。 */
    paidPublishedCount,
    /** 作家自身の Stripe Connect 連携完了状態 */
    stripeReady: !!stripeAccount?.onboardingCompleted,
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

  // Fetch applicant display names via raw query
  const applicantIds = [...new Set(payments.map((p) => p.permission.applicantId))];
  let applicantMap = new Map<string, string>();
  if (applicantIds.length > 0) {
    const applicants = await prisma.$queryRaw<any[]>`
      SELECT id, "displayName" FROM "User" WHERE id = ANY(${applicantIds})
    `;
    applicantMap = new Map(applicants.map((a: any) => [a.id, a.displayName || "不明"]));
  }

  const paymentsWithApplicant = payments.map((p) => ({
    ...p,
    permission: {
      ...p.permission,
      applicantDisplayName: applicantMap.get(p.permission.applicantId) || "不明",
    },
  }));

  const totalRevenue = payments.reduce((sum, p) => sum + p.authorAmount, 0);
  const totalFees = payments.reduce((sum, p) => sum + p.platformFee, 0);

  return { payments: paymentsWithApplicant, totalRevenue, totalFees };
}
