"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicUsersByIds, getPublicUserWithBio, unknownUser } from "@/lib/users";
import { getPlayIfOwner, requireUserId } from "@/lib/auth-helpers";
import { ok, fail, zodFailure } from "@/lib/action-result";
import { playSchema, readPlayInput } from "@/lib/validations/play";
import type { Prisma } from "@prisma/client";

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
  const authorMap = await getPublicUsersByIds(authorIds);

  const playsWithAuthor = plays.map((p) => ({
    ...p,
    bodyPreview: p.body ? p.body.slice(0, 300) : null,
    author: authorMap.get(p.authorId) ?? unknownUser(p.authorId),
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

  const author = await getPublicUserWithBio(play.authorId);

  return { ...play, author };
}

export async function incrementViewCount(id: string) {
  await prisma.$executeRaw`
    UPDATE palette.palette_plays
    SET view_count = view_count + 1
    WHERE id = ${id}`;
}

export async function getGenres() {
  return prisma.paletteGenre.findMany({ orderBy: { id: "asc" } });
}

export async function getStats() {
  const [playCount, authorCount, reviewCount] = await Promise.all([
    prisma.palettePlay.count({ where: { isPublished: true } }),
    prisma.$queryRaw<Array<{ count: number }>>`SELECT COUNT(DISTINCT author_id)::int as count FROM palette.palette_plays WHERE is_published = true`,
    prisma.paletteReview.count(),
  ]);
  return {
    playCount,
    authorCount: authorCount[0]?.count || 0,
    reviewCount,
  };
}

export async function updatePlay(playId: string, formData: FormData) {
  const userId = await requireUserId();

  const play = await getPlayIfOwner(playId, userId);
  if (!play) return fail("権限がありません");

  const parsed = playSchema.safeParse(readPlayInput(formData));
  if (!parsed.success) return zodFailure(parsed.error, formData);

  const genreIds = formData.getAll("genreIds").map(Number) as number[];
  const tagNames = formData.getAll("tagNames").map(String);
  const hasTagInput = formData.has("tagNames");

  const { coverImageUrl: coverUrl, bodyPdfUrl, seriesId, seriesOrder, ...restData } = parsed.data;

  // 指定された seriesId が自分のものか検証。他人のシリーズには紐付けない。
  let safeSeriesId: string | null = null;
  if (seriesId) {
    const s = await prisma.paletteSeries.findUnique({ where: { id: seriesId }, select: { authorId: true } });
    if (s && s.authorId === userId) safeSeriesId = seriesId;
  }
  await prisma.$transaction(async (tx) => {
    await tx.palettePlay.update({
      where: { id: playId },
      data: {
        ...restData,
        coverImageUrl: coverUrl || null,
        bodyPdfUrl: bodyPdfUrl || null,
        seriesId: safeSeriesId,
        seriesOrder: safeSeriesId ? seriesOrder ?? null : null,
      },
    });

    await tx.palettePlayGenre.deleteMany({ where: { playId } });

    if (genreIds.length > 0) {
      await tx.palettePlayGenre.createMany({
        data: genreIds.map((genreId) => ({ playId, genreId })),
      });
    }
  });

  // タグ更新（フォームに tagNames が含まれている場合のみ）
  if (hasTagInput) {
    const { setPlayTags } = await import("@/actions/tags");
    await setPlayTags(playId, tagNames);
  }

  revalidatePath(`/plays/${playId}`);
  revalidatePath("/dashboard/plays");
  return ok();
}

export async function togglePublish(playId: string) {
  const userId = await requireUserId();

  const play = await getPlayIfOwner(playId, userId);
  if (!play) return fail("権限がありません");

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
    const followerIds = await getFollowerIdsOf(userId);
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
  return ok({ isPublished });
}

export async function createPlay(formData: FormData) {
  const userId = await requireUserId();

  const parsed = playSchema.safeParse(readPlayInput(formData));
  if (!parsed.success) return zodFailure(parsed.error, formData);

  const { coverImageUrl: coverUrl, bodyPdfUrl, seriesId, seriesOrder, ...restData } = parsed.data;
  const genreIds = formData.getAll("genreIds").map(Number) as number[];

  // 指定された seriesId が自分のものか検証
  let safeSeriesId: string | null = null;
  if (seriesId) {
    const s = await prisma.paletteSeries.findUnique({ where: { id: seriesId }, select: { authorId: true } });
    if (s && s.authorId === userId) safeSeriesId = seriesId;
  }

  const play = await prisma.palettePlay.create({
    data: {
      ...restData,
      coverImageUrl: coverUrl || null,
      bodyPdfUrl: bodyPdfUrl || null,
      seriesId: safeSeriesId,
      seriesOrder: safeSeriesId ? seriesOrder ?? null : null,
      authorId: userId,
    },
  });

  if (genreIds.length > 0) {
    await prisma.palettePlayGenre.createMany({
      data: genreIds.map((genreId) => ({ playId: play.id, genreId })),
    });
  }

  revalidatePath("/dashboard/plays");
  return ok({ id: play.id });
}

/**
 * エディタ即起動用の下書き作成。タイトルだけ受け取り最小構成で作成する。
 */
export async function createPlayDraft(title: string) {
  const userId = await requireUserId();

  const t = title.trim() || "無題の作品";
  const play = await prisma.palettePlay.create({
    data: {
      title: t,
      synopsis: "（あとで編集）",
      body: "",
      bodyType: "editor",
      bodyOrientation: "portrait",
      readingDirection: "ltr",
      durationMinutes: null,
      castTotal: null,
      castMale: null,
      castFemale: null,
      castOther: null,
      feeAmount: 0,
      isFree: true,
      authorId: userId,
    },
  });
  revalidatePath("/dashboard/plays");
  redirect(`/editor/${play.id}`);
}

/**
 * エディタの自動保存用。bodyJson を更新し、プレーンテキストも body に同期する。
 */
export async function savePlayBody(
  playId: string,
  bodyJson: Record<string, unknown>
) {
  const userId = await requireUserId();
  const play = await getPlayIfOwner(playId, userId);
  if (!play) return fail("権限がありません");

  // bodyJson からプレーンテキストを抽出して body にも保存（検索用）
  const { fromBodyJson, toPlainText } = await import(
    "@/lib/editor/play-document"
  );
  const playDoc = fromBodyJson(bodyJson as Record<string, unknown>);
  const plainText = toPlainText(playDoc);

  await prisma.palettePlay.update({
    where: { id: playId },
    data: {
      bodyJson: bodyJson as Prisma.InputJsonValue,
      body: plainText,
      bodyType: "editor",
    },
  });

  return ok();
}
