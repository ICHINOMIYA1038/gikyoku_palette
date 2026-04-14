"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

type GetPlaysParams = {
  search?: string;
  genreSlug?: string;
  maxDuration?: number;
  maxCast?: number;
  sortBy?: "newest" | "views";
  page?: number;
  perPage?: number;
};

export async function getPlays({
  search,
  genreSlug,
  maxDuration,
  maxCast,
  sortBy = "newest",
  page = 1,
  perPage = 20,
}: GetPlaysParams = {}) {
  const where: Record<string, unknown> = {
    isPublished: true,
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { synopsis: { contains: search, mode: "insensitive" } },
    ];
  }

  if (genreSlug) {
    where.genres = {
      some: { genre: { slug: genreSlug } },
    };
  }

  if (maxDuration) {
    where.durationMinutes = { lte: maxDuration };
  }

  if (maxCast) {
    where.castTotal = { lte: maxCast };
  }

  const orderBy =
    sortBy === "views"
      ? { viewCount: "desc" as const }
      : { publishedAt: "desc" as const };

  const [plays, total] = await Promise.all([
    prisma.palettePlay.findMany({
      where,
      include: {
        genres: { include: { genre: true } },
      },
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.palettePlay.count({ where }),
  ]);

  // 作者情報を別途取得（Userはpublic schema）
  const authorIds = [...new Set(plays.map((p) => p.authorId))];
  const authors = authorIds.length > 0
    ? await prisma.$queryRaw<any[]>`
        SELECT id, name, "displayName", "avatarUrl" FROM "User" WHERE id = ANY(${authorIds})
      `
    : [];
  const authorMap = new Map(authors.map((a: any) => [a.id, a]));

  const playsWithAuthor = plays.map((p) => ({
    ...p,
    author: authorMap.get(p.authorId) || { id: p.authorId, displayName: "不明", avatarUrl: null },
  }));

  return {
    plays: playsWithAuthor,
    total,
    totalPages: Math.ceil(total / perPage),
    currentPage: page,
  };
}

export async function getPlayById(id: string) {
  const play = await prisma.palettePlay.findUnique({
    where: { id },
    include: {
      genres: { include: { genre: true } },
    },
  });

  if (!play) return null;

  const authors = await prisma.$queryRaw<any[]>`
    SELECT id, name, "displayName", bio, "avatarUrl" FROM "User" WHERE id = ${play.authorId}
  `;

  return { ...play, author: authors[0] || null };
}

export async function incrementViewCount(id: string) {
  await prisma.palettePlay.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });
}

export async function getGenres() {
  return prisma.paletteGenre.findMany({ orderBy: { id: "asc" } });
}

const playUpdateSchema = z.object({
  title: z.string().min(1).max(200),
  synopsis: z.string().min(1),
  durationMinutes: z.coerce.number().int().positive(),
  castTotal: z.coerce.number().int().positive(),
  castMale: z.coerce.number().int().min(0),
  castFemale: z.coerce.number().int().min(0),
  castOther: z.coerce.number().int().min(0),
  feeAmount: z.coerce.number().int().min(0),
  isFree: z.coerce.boolean(),
});

export async function updatePlay(playId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const play = await prisma.palettePlay.findUnique({ where: { id: playId } });
  if (!play || play.authorId !== session.user.id) {
    return { error: "権限がありません" };
  }

  const parsed = playUpdateSchema.safeParse({
    title: formData.get("title"),
    synopsis: formData.get("synopsis"),
    durationMinutes: formData.get("durationMinutes"),
    castTotal: formData.get("castTotal"),
    castMale: formData.get("castMale"),
    castFemale: formData.get("castFemale"),
    castOther: formData.get("castOther"),
    feeAmount: formData.get("feeAmount"),
    isFree: formData.get("isFree") === "true",
  });

  if (!parsed.success) {
    return { error: "入力内容に誤りがあります" };
  }

  await prisma.palettePlay.update({
    where: { id: playId },
    data: parsed.data,
  });

  revalidatePath(`/plays/${playId}`);
  revalidatePath("/dashboard/plays");
  return { success: true };
}

export async function togglePublish(playId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const play = await prisma.palettePlay.findUnique({ where: { id: playId } });
  if (!play || play.authorId !== session.user.id) {
    return { error: "権限がありません" };
  }

  const isPublished = !play.isPublished;
  await prisma.palettePlay.update({
    where: { id: playId },
    data: {
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard/plays");
  return { success: true, isPublished };
}

export async function createPlay(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = playUpdateSchema.safeParse({
    title: formData.get("title"),
    synopsis: formData.get("synopsis"),
    durationMinutes: formData.get("durationMinutes"),
    castTotal: formData.get("castTotal"),
    castMale: formData.get("castMale"),
    castFemale: formData.get("castFemale"),
    castOther: formData.get("castOther"),
    feeAmount: formData.get("feeAmount"),
    isFree: formData.get("isFree") === "true",
  });

  if (!parsed.success) {
    return { error: "入力内容に誤りがあります" };
  }

  const play = await prisma.palettePlay.create({
    data: {
      ...parsed.data,
      authorId: session.user.id,
      body: (formData.get("body") as string) || null,
    },
  });

  revalidatePath("/dashboard/plays");
  return { success: true, id: play.id };
}
