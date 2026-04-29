"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 直近 N 日分の日次バケットを (日付, 値) で返す。
 * 値が無い日は 0 で埋める。
 */
function bucketByDay(
  rows: Array<{ d: Date | string; c: number | bigint }>,
  days: number,
  now: Date = new Date()
) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.d);
    const key = d.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + Number(r.c));
  }
  const result: Array<{ date: string; value: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, value: map.get(key) ?? 0 });
  }
  return result;
}

function bucketByMonth(
  rows: Array<{ m: Date | string; c: number | bigint }>,
  months: number,
  now: Date = new Date()
) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.m);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + Number(r.c));
  }
  const result: Array<{ month: string; value: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(monthStart.getFullYear(), monthStart.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    result.push({ month: key, value: map.get(key) ?? 0 });
  }
  return result;
}

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

// ============================================
// 分析ダッシュボード用クエリ
// ============================================

export type Activity = {
  id: string;
  kind: "permission" | "review" | "follow" | "payment";
  createdAt: string;
  title: string;
  detail: string;
  href: string | null;
};

export async function getDashboardAnalytics() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    permissionByDayRaw,
    revenueByMonthRaw,
    topPlays,
    recentPermissions,
    recentReviews,
    recentFollows,
    followerCount,
    bookmarkCount,
  ] = await Promise.all([
    // 直近30日の申請数（自分の作品宛）
    prisma.$queryRaw<Array<{ d: Date; c: bigint }>>`
      SELECT date_trunc('day', p.created_at) AS d, COUNT(*) AS c
      FROM palette.palette_permissions p
      JOIN palette.palette_plays pl ON pl.id = p.play_id
      WHERE pl.author_id = ${userId}
        AND p.created_at >= ${thirtyDaysAgo}
      GROUP BY 1 ORDER BY 1
    `,
    // 直近6ヶ月の月別売上（執筆者受取額）
    prisma.$queryRaw<Array<{ m: Date; c: bigint }>>`
      SELECT date_trunc('month', pay.completed_at) AS m, SUM(pay.author_amount) AS c
      FROM palette.palette_payments pay
      JOIN palette.palette_permissions p ON p.id = pay.permission_id
      JOIN palette.palette_plays pl ON pl.id = p.play_id
      WHERE pl.author_id = ${userId}
        AND pay.status = 'completed'
        AND pay.completed_at >= ${sixMonthsAgo}
      GROUP BY 1 ORDER BY 1
    `,
    // 閲覧数 TOP 5 の自分の公開作品
    prisma.palettePlay.findMany({
      where: { authorId: userId, isPublished: true },
      orderBy: { viewCount: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        viewCount: true,
        downloadCount: true,
        reviewCount: true,
        avgRating: true,
      },
    }),
    // 直近の申請
    prisma.palettePermission.findMany({
      where: { play: { authorId: userId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        play: { select: { title: true } },
        thread: { select: { id: true } },
      },
    }),
    // 直近のレビュー
    prisma.paletteReview.findMany({
      where: { play: { authorId: userId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { play: { select: { id: true, title: true } } },
    }),
    // 直近のフォロワー
    prisma.paletteFollow.findMany({
      where: { followeeId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.paletteFollow.count({ where: { followeeId: userId } }),
    // 自分作品が受けた累計ブックマーク
    prisma.paletteBookmark.count({
      where: { play: { authorId: userId } },
    }),
  ]);

  // 申請者・レビュアー・フォロワーの表示名解決
  const userIdsToResolve = Array.from(
    new Set([
      ...recentPermissions.map((p) => p.applicantId),
      ...recentReviews.map((r) => r.userId),
      ...recentFollows.map((f) => f.followerId),
    ])
  );
  const users =
    userIdsToResolve.length > 0
      ? await prisma.$queryRaw<Array<{ id: string; displayName: string | null; name: string | null }>>`
        SELECT id, "displayName", name FROM "public"."User" WHERE id = ANY(${userIdsToResolve})
      `
      : [];
  const nameMap = new Map(
    users.map((u) => [u.id, u.displayName || u.name || "ユーザー"])
  );

  const permissionsByDay = bucketByDay(permissionByDayRaw, 30, now);
  const revenueByMonth = bucketByMonth(revenueByMonthRaw, 6, now);

  // 統合アクティビティフィード（最大10件、新しい順）
  const activities: Activity[] = [
    ...recentPermissions.map<Activity>((p) => ({
      id: `perm-${p.id}`,
      kind: "permission",
      createdAt: p.createdAt.toISOString(),
      title: `${nameMap.get(p.applicantId) || "申請者"} さんから申請`,
      detail: `「${p.play.title}」 / ${p.organizationName}`,
      href: p.thread ? `/threads/${p.thread.id}` : null,
    })),
    ...recentReviews.map<Activity>((r) => ({
      id: `rev-${r.id}`,
      kind: "review",
      createdAt: r.createdAt.toISOString(),
      title: `${nameMap.get(r.userId) || "ユーザー"} さんがレビュー (★${r.rating})`,
      detail: `「${r.play.title}」`,
      href: `/plays/${r.play.id}`,
    })),
    ...recentFollows.map<Activity>((f) => ({
      id: `fol-${f.id}`,
      kind: "follow",
      createdAt: f.createdAt.toISOString(),
      title: `${nameMap.get(f.followerId) || "ユーザー"} さんがフォロー`,
      detail: "フォロー中の作家として登録されました",
      href: null,
    })),
  ]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 10);

  return {
    permissionsByDay,
    revenueByMonth,
    topPlays,
    activities,
    followerCount,
    bookmarkCount,
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
      SELECT id, "displayName" FROM "public"."User" WHERE id = ANY(${applicantIds})
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
