"use server";

import { prisma } from "@/lib/db";
import { getPublicUsersByIds, unknownUser, type PublicUser } from "@/lib/users";

type RankingType = "views" | "rating" | "downloads";

export async function getRankings(type: RankingType = "views", limit = 50) {
  let orderBy: Record<string, string>;
  let extraWhere: Record<string, unknown> = {};

  switch (type) {
    case "rating":
      orderBy = { avgRating: "desc" };
      extraWhere = { reviewCount: { gte: 1 } };
      break;
    case "downloads":
      orderBy = { downloadCount: "desc" };
      break;
    case "views":
    default:
      orderBy = { viewCount: "desc" };
      break;
  }

  const plays = await prisma.palettePlay.findMany({
    where: { isPublished: true, ...extraWhere },
    include: { genres: { include: { genre: true } } },
    orderBy,
    take: limit,
  });

  const authorIds = [...new Set(plays.map((p) => p.authorId))];
  const authorMap: Map<string, PublicUser> = await getPublicUsersByIds(authorIds);

  return plays.map((p, i) => ({
    rank: i + 1,
    ...p,
    author: authorMap.get(p.authorId) ?? unknownUser(p.authorId),
  }));
}

export async function getPopularPlays(limit = 6) {
  const plays = await prisma.palettePlay.findMany({
    where: { isPublished: true, viewCount: { gt: 0 } },
    include: { genres: { include: { genre: true } } },
    orderBy: { viewCount: "desc" },
    take: limit,
  });

  const authorIds = [...new Set(plays.map((p) => p.authorId))];
  const authorMap: Map<string, PublicUser> = await getPublicUsersByIds(authorIds);

  return plays.map((p) => ({
    ...p,
    bodyPreview: p.body ? p.body.slice(0, 300) : null,
    author: authorMap.get(p.authorId) ?? unknownUser(p.authorId),
  }));
}
