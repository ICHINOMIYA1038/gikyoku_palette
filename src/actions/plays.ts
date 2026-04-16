"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extractFormValues } from "@/lib/form-values";
import { z } from "zod";

type GetPlaysParams = {
  search?: string;
  genreSlug?: string;
  maxDuration?: number;
  maxCast?: number;
  sortBy?: "newest" | "views" | "rating" | "downloads";
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

  let orderBy;
  switch (sortBy) {
    case "views":
      orderBy = { viewCount: "desc" as const };
      break;
    case "rating":
      orderBy = { avgRating: "desc" as const };
      break;
    case "downloads":
      orderBy = { downloadCount: "desc" as const };
      break;
    default:
      orderBy = { publishedAt: "desc" as const };
      break;
  }

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
    bodyPreview: p.body ? p.body.slice(0, 300) : null,
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

export async function getStats() {
  const [playCount, authorCount, reviewCount] = await Promise.all([
    prisma.palettePlay.count({ where: { isPublished: true } }),
    prisma.$queryRaw<any[]>`SELECT COUNT(DISTINCT author_id)::int as count FROM palette_plays WHERE is_published = true`,
    prisma.paletteReview.count(),
  ]);
  return {
    playCount,
    authorCount: authorCount[0]?.count || 0,
    reviewCount,
  };
}

/**
 * アップロード API は dev では "/api/storage/..." 相対パス、
 * 本番では "https://..." 絶対URL を返すため、両方を許容する。
 */
const uploadedUrl = z
  .string()
  .refine(
    (v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v),
    "URLの形式が不正です"
  );

const playSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください").max(200),
  synopsis: z.string().min(1, "あらすじを入力してください"),
  body: z.string().max(500000, "本文は50万文字以内にしてください").optional().default(""),
  bodyType: z.enum(["text", "pdf"]).default("text"),
  bodyPdfUrl: uploadedUrl.optional().or(z.literal("")),
  bodyOrientation: z.enum(["portrait", "landscape"]).default("portrait"),
  durationMinutes: z.coerce.number().int().positive("上演時間を入力してください"),
  castTotal: z.coerce.number().int().positive("出演人数を入力してください"),
  castMale: z.coerce.number().int().min(0),
  castFemale: z.coerce.number().int().min(0),
  castOther: z.coerce.number().int().min(0),
  feeAmount: z.coerce.number().int().min(0),
  isFree: z.coerce.boolean(),
  coverImageUrl: uploadedUrl.optional().or(z.literal("")),
});

export async function updatePlay(playId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const play = await prisma.palettePlay.findUnique({ where: { id: playId } });
  if (!play || play.authorId !== session.user.id) {
    return { error: "権限がありません" };
  }

  const coverImageRaw = formData.get("coverImageUrl") as string | null;
  const bodyPdfUrlRaw = formData.get("bodyPdfUrl") as string | null;
  const parsed = playSchema.safeParse({
    title: formData.get("title"),
    synopsis: formData.get("synopsis"),
    body: formData.get("body"),
    bodyType: formData.get("bodyType") || "text",
    bodyPdfUrl: bodyPdfUrlRaw || undefined,
    bodyOrientation: formData.get("bodyOrientation") || "portrait",
    durationMinutes: formData.get("durationMinutes"),
    castTotal: formData.get("castTotal"),
    castMale: formData.get("castMale"),
    castFemale: formData.get("castFemale"),
    castOther: formData.get("castOther"),
    feeAmount: formData.get("feeAmount"),
    isFree: formData.get("isFree") === "true",
    coverImageUrl: coverImageRaw || undefined,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const first = Object.entries(fieldErrors).find(([, v]) => v && v.length > 0);
    const summary = first
      ? `${first[0]}: ${first[1]![0]}`
      : "入力内容に誤りがあります";
    // 失敗時は入力内容を values で返し、クライアント側で defaultValue に使えるようにする
    return { error: summary, fieldErrors, values: extractFormValues(formData) };
  }

  const genreIds = formData.getAll("genreIds").map(Number) as number[];

  const { coverImageUrl: coverUrl, bodyPdfUrl, ...restData } = parsed.data;
  await prisma.$transaction(async (tx) => {
    await tx.palettePlay.update({
      where: { id: playId },
      data: {
        ...restData,
        coverImageUrl: coverUrl || null,
        bodyPdfUrl: bodyPdfUrl || null,
      },
    });

    await tx.palettePlayGenre.deleteMany({ where: { playId } });

    if (genreIds.length > 0) {
      await tx.palettePlayGenre.createMany({
        data: genreIds.map((genreId) => ({ playId, genreId })),
      });
    }
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
  const wasFirstPublish = isPublished && !play.publishedAt;

  await prisma.palettePlay.update({
    where: { id: playId },
    data: {
      isPublished,
      publishedAt: isPublished ? new Date() : null,
    },
  });

  // 初公開のとき、フォロワーへ通知
  if (wasFirstPublish) {
    const { getFollowerIdsOf } = await import("@/actions/follows");
    const { createNotification } = await import("@/actions/notifications");
    const followerIds = await getFollowerIdsOf(session.user.id);
    await Promise.all(
      followerIds.map((followerId) =>
        createNotification({
          userId: followerId,
          type: "new_play_published",
          title: "フォロー中の作家が新作を公開しました",
          message: `「${play.title}」が公開されました。`,
        })
      )
    );
  }

  revalidatePath("/");
  revalidatePath("/dashboard/plays");
  return { success: true, isPublished };
}

export async function createPlay(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const coverImageRaw = formData.get("coverImageUrl") as string | null;
  const bodyPdfUrlRaw = formData.get("bodyPdfUrl") as string | null;
  const parsed = playSchema.safeParse({
    title: formData.get("title"),
    synopsis: formData.get("synopsis"),
    body: formData.get("body"),
    bodyType: formData.get("bodyType") || "text",
    bodyPdfUrl: bodyPdfUrlRaw || undefined,
    bodyOrientation: formData.get("bodyOrientation") || "portrait",
    durationMinutes: formData.get("durationMinutes"),
    castTotal: formData.get("castTotal"),
    castMale: formData.get("castMale"),
    castFemale: formData.get("castFemale"),
    castOther: formData.get("castOther"),
    feeAmount: formData.get("feeAmount"),
    isFree: formData.get("isFree") === "true",
    coverImageUrl: coverImageRaw || undefined,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const first = Object.entries(fieldErrors).find(([, v]) => v && v.length > 0);
    const summary = first
      ? `${first[0]}: ${first[1]![0]}`
      : "入力内容に誤りがあります";
    return { error: summary, fieldErrors, values: extractFormValues(formData) };
  }

  const { coverImageUrl: coverUrl, bodyPdfUrl, ...restData } = parsed.data;
  const genreIds = formData.getAll("genreIds").map(Number) as number[];

  const play = await prisma.palettePlay.create({
    data: {
      ...restData,
      coverImageUrl: coverUrl || null,
      bodyPdfUrl: bodyPdfUrl || null,
      authorId: session.user.id,
    },
  });

  if (genreIds.length > 0) {
    await prisma.palettePlayGenre.createMany({
      data: genreIds.map((genreId) => ({ playId: play.id, genreId })),
    });
  }

  revalidatePath("/dashboard/plays");
  return { success: true, id: play.id };
}
