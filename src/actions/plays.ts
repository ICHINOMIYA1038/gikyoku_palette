"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
      { author: { displayName: { contains: search, mode: "insensitive" } } },
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
    prisma.play.findMany({
      where,
      include: {
        author: { select: { id: true, displayName: true, avatarUrl: true } },
        genres: { include: { genre: true } },
      },
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.play.count({ where }),
  ]);

  return {
    plays,
    total,
    totalPages: Math.ceil(total / perPage),
    currentPage: page,
  };
}

export async function getPlayById(id: string) {
  const play = await prisma.play.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, displayName: true, bio: true, avatarUrl: true },
      },
      genres: { include: { genre: true } },
    },
  });

  return play;
}

export async function incrementViewCount(id: string) {
  await prisma.play.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });
}

export async function getGenres() {
  return prisma.genre.findMany({ orderBy: { id: "asc" } });
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const play = await prisma.play.findUnique({ where: { id: playId } });
  if (!play || play.authorId !== user.id) {
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

  await prisma.play.update({
    where: { id: playId },
    data: parsed.data,
  });

  revalidatePath(`/plays/${playId}`);
  revalidatePath("/dashboard/plays");
  return { success: true };
}

export async function togglePublish(playId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const play = await prisma.play.findUnique({ where: { id: playId } });
  if (!play || play.authorId !== user.id) {
    return { error: "権限がありません" };
  }

  const isPublished = !play.isPublished;
  await prisma.play.update({
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
