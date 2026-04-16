"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "評価を選択してください").max(5),
  comment: z.string().max(2000, "感想は2000文字以内で入力してください").optional().default(""),
});

// レビュー投稿/更新（1ユーザー1作品1レビュー、upsert）
export async function createReview(playId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // 自分の作品にはレビュー不可
  const play = await prisma.palettePlay.findUnique({ where: { id: playId }, select: { authorId: true } });
  if (!play) return { error: "作品が見つかりません" };
  if (play.authorId === session.user.id) return { error: "自分の作品にはレビューできません" };

  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating"),
    comment: formData.get("comment") || "",
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  await prisma.paletteReview.upsert({
    where: { playId_userId: { playId, userId: session.user.id } },
    create: { playId, userId: session.user.id, ...parsed.data },
    update: parsed.data,
  });

  await updatePlayRatingCache(playId);
  revalidatePath(`/plays/${playId}`);
  return { success: true };
}

// レビュー削除
export async function deleteReview(reviewId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const review = await prisma.paletteReview.findUnique({ where: { id: reviewId } });
  if (!review || review.userId !== session.user.id) return { error: "権限がありません" };

  await prisma.paletteReview.delete({ where: { id: reviewId } });
  await updatePlayRatingCache(review.playId);
  revalidatePath(`/plays/${review.playId}`);
  return { success: true };
}

// レビュー一覧取得（ページネーション付き）
export async function getReviews(playId: string, page = 1, perPage = 10) {
  const [reviews, total] = await Promise.all([
    prisma.paletteReview.findMany({
      where: { playId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.paletteReview.count({ where: { playId } }),
  ]);

  // ユーザー情報を raw SQL で取得（displayName が null の場合は name で fallback）
  const userIds = [...new Set(reviews.map(r => r.userId))];
  let userMap = new Map<string, { id: string; displayName: string; avatarUrl: string | null }>();
  if (userIds.length > 0) {
    const users = await prisma.$queryRaw<
      Array<{ id: string; displayName: string | null; name: string | null; avatarUrl: string | null }>
    >`
      SELECT id, "displayName", name, "avatarUrl" FROM "User" WHERE id = ANY(${userIds})
    `;
    userMap = new Map(
      users.map((u) => [
        u.id,
        {
          id: u.id,
          displayName: u.displayName || u.name || "ユーザー",
          avatarUrl: u.avatarUrl,
        },
      ])
    );
  }

  const reviewsWithUser = reviews.map((r) => ({
    ...r,
    user: userMap.get(r.userId) || {
      id: r.userId,
      displayName: "不明",
      avatarUrl: null,
    },
  }));

  return { reviews: reviewsWithUser, total, totalPages: Math.ceil(total / perPage) };
}

// 現在のユーザーの既存レビューを取得
export async function getUserReview(playId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.paletteReview.findUnique({
    where: { playId_userId: { playId, userId: session.user.id } },
  });
}

// 平均評価キャッシュ更新（内部関数）
async function updatePlayRatingCache(playId: string) {
  const agg = await prisma.paletteReview.aggregate({
    where: { playId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.palettePlay.update({
    where: { id: playId },
    data: {
      avgRating: agg._avg.rating || 0,
      reviewCount: agg._count.rating,
    },
  });
}
