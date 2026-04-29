"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const seriesSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください").max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  coverImageUrl: z
    .string()
    .refine(
      (v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v),
      "URLの形式が不正です"
    )
    .optional()
    .or(z.literal("")),
});

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

  const authors = await prisma.$queryRaw<any[]>`
    SELECT id, name, "displayName", "avatarUrl" FROM "public"."User" WHERE id = ${series.authorId}
  `;

  return { ...series, author: authors[0] || null };
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
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = seriesSchema.safeParse({
    title: formData.get("title") || "",
    description: formData.get("description") || "",
    coverImageUrl: formData.get("coverImageUrl") || "",
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const first = Object.entries(fieldErrors).find(([, v]) => v && v.length > 0);
    return {
      error: first ? `${first[0]}: ${first[1]![0]}` : "入力内容に誤りがあります",
    };
  }

  const series = await prisma.paletteSeries.create({
    data: {
      authorId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      coverImageUrl: parsed.data.coverImageUrl || null,
    },
  });

  revalidatePath("/dashboard/series");
  return { success: true, id: series.id };
}

export async function updateSeries(seriesId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const s = await prisma.paletteSeries.findUnique({ where: { id: seriesId } });
  if (!s || s.authorId !== session.user.id) {
    return { error: "権限がありません" };
  }

  const parsed = seriesSchema.safeParse({
    title: formData.get("title") || "",
    description: formData.get("description") || "",
    coverImageUrl: formData.get("coverImageUrl") || "",
  });
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const first = Object.entries(fieldErrors).find(([, v]) => v && v.length > 0);
    return {
      error: first ? `${first[0]}: ${first[1]![0]}` : "入力内容に誤りがあります",
    };
  }

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
  return { success: true };
}

export async function deleteSeries(seriesId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const s = await prisma.paletteSeries.findUnique({ where: { id: seriesId } });
  if (!s || s.authorId !== session.user.id) {
    return { error: "権限がありません" };
  }

  // 作品はそのまま残り、seriesId は SetNull
  await prisma.paletteSeries.delete({ where: { id: seriesId } });

  revalidatePath("/dashboard/series");
  return { success: true };
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
