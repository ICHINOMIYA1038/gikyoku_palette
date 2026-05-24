"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPublicUser } from "@/lib/users";
import { getSeriesIfOwner, requireUserId } from "@/lib/auth-helpers";
import { ok, fail, zodFailure } from "@/lib/action-result";
import { seriesSchema } from "@/lib/validations/series";

/**
 * シリーズを1件取得。plays は seriesOrder → publishedAt の昇順。
 * 公開中のみに絞るかは呼び出し側で制御できるよう options で切り替え。
 */
export async function getSeriesById(id: string, opts: { publishedOnly?: boolean } = {}) {
  const series = await prisma.paletteSeries.findUnique({
    where: { id },
    include: {
      plays: {
        where: opts.publishedOnly ? { isPublished: true } : undefined,
        orderBy: [
          { seriesOrder: { sort: "asc", nulls: "last" } },
          { publishedAt: "asc" },
        ],
        include: { genres: { include: { genre: true } } },
      },
    },
  });

  if (!series) return null;

  const author = await getPublicUser(series.authorId);

  return { ...series, author };
}

/**
 * 指定作者のシリーズ一覧。
 */
export async function listSeriesByAuthor(authorId: string) {
  const rows = await prisma.paletteSeries.findMany({
    where: { authorId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { plays: true } },
    },
  });
  return rows;
}

/**
 * 自分のシリーズ一覧 (作成/編集用)。
 */
export async function listMySeries() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return listSeriesByAuthor(session.user.id);
}

export async function createSeries(formData: FormData) {
  const userId = await requireUserId();

  const parsed = seriesSchema.safeParse({
    title: formData.get("title") || "",
    description: formData.get("description") || "",
    coverImageUrl: formData.get("coverImageUrl") || "",
  });
  if (!parsed.success) return zodFailure(parsed.error, formData);

  const series = await prisma.paletteSeries.create({
    data: {
      authorId: userId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      coverImageUrl: parsed.data.coverImageUrl || null,
    },
  });

  revalidatePath("/dashboard/series");
  return ok({ id: series.id });
}

export async function updateSeries(seriesId: string, formData: FormData) {
  const userId = await requireUserId();
  const s = await getSeriesIfOwner(seriesId, userId);
  if (!s) return fail("権限がありません");

  const parsed = seriesSchema.safeParse({
    title: formData.get("title") || "",
    description: formData.get("description") || "",
    coverImageUrl: formData.get("coverImageUrl") || "",
  });
  if (!parsed.success) return zodFailure(parsed.error, formData);

  await prisma.paletteSeries.update({
    where: { id: seriesId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      coverImageUrl: parsed.data.coverImageUrl || null,
    },
  });

  revalidatePath(`/series/${seriesId}`);
  revalidatePath("/dashboard/series");
  return ok();
}

export async function deleteSeries(seriesId: string) {
  const userId = await requireUserId();
  const s = await getSeriesIfOwner(seriesId, userId);
  if (!s) return fail("権限がありません");

  // 作品はそのまま残り、seriesId は SetNull
  await prisma.paletteSeries.delete({ where: { id: seriesId } });

  revalidatePath("/dashboard/series");
  return ok();
}

/**
 * 作品の前後ナビゲーション用。seriesOrder → publishedAt で順番を出す。
 */
export async function getSeriesNavigation(playId: string) {
  const play = await prisma.palettePlay.findUnique({
    where: { id: playId },
    select: { seriesId: true, seriesOrder: true, publishedAt: true },
  });
  if (!play?.seriesId) return null;

  const siblings = await prisma.palettePlay.findMany({
    where: { seriesId: play.seriesId, isPublished: true },
    orderBy: [
      { seriesOrder: { sort: "asc", nulls: "last" } },
      { publishedAt: "asc" },
    ],
    select: { id: true, title: true, seriesOrder: true },
  });

  const idx = siblings.findIndex((p) => p.id === playId);
  if (idx < 0) return null;

  const series = await prisma.paletteSeries.findUnique({
    where: { id: play.seriesId },
    select: { id: true, title: true },
  });

  return {
    series,
    prev: idx > 0 ? siblings[idx - 1] : null,
    next: idx < siblings.length - 1 ? siblings[idx + 1] : null,
    total: siblings.length,
    current: idx + 1,
  };
}
