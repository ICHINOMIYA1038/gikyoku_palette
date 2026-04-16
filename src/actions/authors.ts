"use server";

import { prisma } from "@/lib/db";

type GetAuthorsParams = {
  sort?: "newest" | "plays" | "alphabetical";
  page?: number;
  perPage?: number;
};

export async function getAuthors({
  sort = "plays",
  page = 1,
  perPage = 24,
}: GetAuthorsParams = {}) {
  const offset = (page - 1) * perPage;

  let authors: any[];

  // Dynamic ORDER BY cannot be parameterized in Prisma's tagged template,
  // so we use separate queries for each sort option.
  switch (sort) {
    case "newest":
      authors = await prisma.$queryRaw<any[]>`
        SELECT u.id, u."displayName", u."avatarUrl", u.bio,
               COUNT(p.id)::int as play_count
        FROM "User" u
        INNER JOIN palette_plays p ON p.author_id = u.id AND p.is_published = true
        GROUP BY u.id
        ORDER BY MIN(p.created_at) DESC
        LIMIT ${perPage} OFFSET ${offset}
      `;
      break;
    case "alphabetical":
      authors = await prisma.$queryRaw<any[]>`
        SELECT u.id, u."displayName", u."avatarUrl", u.bio,
               COUNT(p.id)::int as play_count
        FROM "User" u
        INNER JOIN palette_plays p ON p.author_id = u.id AND p.is_published = true
        GROUP BY u.id
        ORDER BY u."displayName" ASC
        LIMIT ${perPage} OFFSET ${offset}
      `;
      break;
    case "plays":
    default:
      authors = await prisma.$queryRaw<any[]>`
        SELECT u.id, u."displayName", u."avatarUrl", u.bio,
               COUNT(p.id)::int as play_count
        FROM "User" u
        INNER JOIN palette_plays p ON p.author_id = u.id AND p.is_published = true
        GROUP BY u.id
        ORDER BY play_count DESC, u."displayName" ASC
        LIMIT ${perPage} OFFSET ${offset}
      `;
      break;
  }

  const countResult = await prisma.$queryRaw<any[]>`
    SELECT COUNT(DISTINCT p.author_id)::int as total
    FROM palette_plays p
    WHERE p.is_published = true
  `;

  const total = countResult[0]?.total || 0;

  return {
    authors,
    total,
    totalPages: Math.ceil(total / perPage),
    currentPage: page,
  };
}
