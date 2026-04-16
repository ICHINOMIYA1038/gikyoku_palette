"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * ブックマークのトグル。既にあれば削除、なければ作成。
 * 戻り値: 更新後の bookmarked 状態
 */
export async function toggleBookmark(playId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const existing = await prisma.paletteBookmark.findUnique({
    where: { userId_playId: { userId, playId } },
  });

  if (existing) {
    await prisma.paletteBookmark.delete({ where: { id: existing.id } });
    revalidatePath(`/plays/${playId}`);
    revalidatePath("/bookmarks");
    return { bookmarked: false };
  }

  await prisma.paletteBookmark.create({
    data: { userId, playId },
  });
  revalidatePath(`/plays/${playId}`);
  revalidatePath("/bookmarks");
  return { bookmarked: true };
}

/** 自分のブックマーク一覧（作品付き） */
export async function getMyBookmarks() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const bookmarks = await prisma.paletteBookmark.findMany({
    where: { userId: session.user.id },
    include: {
      play: {
        include: { genres: { include: { genre: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 著者表示名は raw query で
  const authorIds = Array.from(new Set(bookmarks.map((b) => b.play.authorId)));
  const authors =
    authorIds.length > 0
      ? await prisma.$queryRaw<Array<{ id: string; displayName: string | null; name: string | null }>>`
        SELECT id, "displayName", name FROM "User" WHERE id = ANY(${authorIds})
      `
      : [];
  const authorMap = new Map(
    authors.map((a) => [a.id, a.displayName || a.name || "不明"])
  );

  return bookmarks.map((b) => ({
    ...b,
    play: {
      ...b.play,
      authorDisplayName: authorMap.get(b.play.authorId) || "不明",
    },
  }));
}

/** 指定 play が自分にブックマークされているか + 全体カウント */
export async function getBookmarkState(playId: string) {
  const session = await auth();
  const userId = session?.user?.id;

  const [count, mine] = await Promise.all([
    prisma.paletteBookmark.count({ where: { playId } }),
    userId
      ? prisma.paletteBookmark.findUnique({
          where: { userId_playId: { userId, playId } },
        })
      : Promise.resolve(null),
  ]);

  return { bookmarked: !!mine, count };
}
