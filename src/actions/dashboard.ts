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
    // 当事者間振込モデルのため、確定許可済み案件の上演料を月次集計（自己申告ベース）
    prisma.palettePermission.aggregate({
      where: {
        play: { authorId: userId },
        status: "permitted",
        transferConfirmedAt: { gte: startOfMonth },
      },
      _sum: { feeAmount: true },
    }),
  ]);

  return {
    publishedPlays,
    totalViews: totalViews._sum.viewCount || 0,
    pendingApplications,
    monthlyRevenue: monthlyRevenue._sum.feeAmount || 0,
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
    // 直近6ヶ月の月別売上（許可確定額ベース）
    prisma.$queryRaw<Array<{ m: Date; c: bigint }>>`
      SELECT date_trunc('month', p.transfer_confirmed_at) AS m, SUM(p.fee_amount) AS c
      FROM palette.palette_permissions p
      JOIN palette.palette_plays pl ON pl.id = p.play_id
      WHERE pl.author_id = ${userId}
        AND p.status = 'permitted'
        AND p.transfer_confirmed_at >= ${sixMonthsAgo}
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

/**
 * 売上一覧。当事者間振込モデルでは、許可確定（transferConfirmedAt）した案件を売上として集計。
 * プラットフォームは決済に関与しないため、実額は作家自身の自己申告ベース。
 */
export async function getSalesSummary() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const permissions = await prisma.palettePermission.findMany({
    where: {
      play: { authorId: session.user.id },
      status: "permitted",
    },
    include: {
      play: { select: { title: true } },
    },
    orderBy: { transferConfirmedAt: "desc" },
  });

  const applicantIds = [...new Set(permissions.map((p) => p.applicantId))];
  let applicantMap = new Map<string, string>();
  if (applicantIds.length > 0) {
    const applicants = await prisma.$queryRaw<Array<{ id: string; displayName: string | null }>>`
      SELECT id, "displayName" FROM "public"."User" WHERE id = ANY(${applicantIds})
    `;
    applicantMap = new Map(applicants.map((a) => [a.id, a.displayName ?? "不明"]));
  }

  const items = permissions.map((p) => ({
    id: p.id,
    permissionNumber: p.permissionNumber,
    feeAmount: p.feeAmount,
    transferConfirmedAt: p.transferConfirmedAt,
    playTitle: p.play.title,
    organizationName: p.organizationName,
    performanceTitle: p.performanceTitle,
    applicantDisplayName: applicantMap.get(p.applicantId) || "不明",
  }));

  const totalRevenue = permissions.reduce((sum, p) => sum + p.feeAmount, 0);

  return { items, totalRevenue };
}
