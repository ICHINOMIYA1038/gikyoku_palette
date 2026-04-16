"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** 自分が指定ユーザーをフォローしているかと、相手のフォロワー数 */
export async function getFollowState(targetUserId: string) {
  const session = await auth();
  const userId = session?.user?.id;

  const [count, mine] = await Promise.all([
    prisma.paletteFollow.count({ where: { followeeId: targetUserId } }),
    userId && userId !== targetUserId
      ? prisma.paletteFollow.findUnique({
          where: {
            followerId_followeeId: { followerId: userId, followeeId: targetUserId },
          },
        })
      : Promise.resolve(null),
  ]);
  return {
    following: !!mine,
    followerCount: count,
    canFollow: !!userId && userId !== targetUserId,
  };
}

/** フォローのトグル */
export async function toggleFollow(targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  if (userId === targetUserId) return { error: "自分自身はフォローできません" };

  const existing = await prisma.paletteFollow.findUnique({
    where: { followerId_followeeId: { followerId: userId, followeeId: targetUserId } },
  });
  if (existing) {
    await prisma.paletteFollow.delete({ where: { id: existing.id } });
    revalidatePath(`/authors/${targetUserId}`);
    revalidatePath("/following");
    return { following: false };
  }
  await prisma.paletteFollow.create({
    data: { followerId: userId, followeeId: targetUserId },
  });
  revalidatePath(`/authors/${targetUserId}`);
  revalidatePath("/following");
  return { following: true };
}

/** 自分がフォローしている作家一覧 */
export async function getFollowing() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const follows = await prisma.paletteFollow.findMany({
    where: { followerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  const ids = follows.map((f) => f.followeeId);
  if (ids.length === 0) return [];

  const users = await prisma.$queryRaw<
    Array<{
      id: string;
      displayName: string | null;
      name: string | null;
      bio: string | null;
      avatarUrl: string | null;
      image: string | null;
    }>
  >`
    SELECT id, "displayName", name, bio, "avatarUrl", image
    FROM "User" WHERE id = ANY(${ids})
  `;
  const map = new Map(users.map((u) => [u.id, u]));

  return follows.map((f) => {
    const u = map.get(f.followeeId);
    return {
      id: f.followeeId,
      followedAt: f.createdAt.toISOString(),
      name: u?.displayName || u?.name || "ユーザー",
      bio: u?.bio || null,
      avatarUrl: u?.avatarUrl || u?.image || null,
    };
  });
}

/** 指定作家のフォロワー id 一覧（新作通知配信用） */
export async function getFollowerIdsOf(authorId: string): Promise<string[]> {
  const rows = await prisma.paletteFollow.findMany({
    where: { followeeId: authorId },
    select: { followerId: true },
  });
  return rows.map((r) => r.followerId);
}
