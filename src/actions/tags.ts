"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getPublicUsersByIds, unknownUser } from "@/lib/users";
import { getPlayIfOwner, requireUserId } from "@/lib/auth-helpers";

const MAX_TAGS_PER_PLAY = 10;
const MAX_TAG_LENGTH = 30;

/**
 * 入力されたタグ文字列を slug に正規化する。
 * - 前後の空白を削除
 * - 小文字化(英数字)
 * - 連続空白をハイフン1つに
 * - スラッシュやURL安全でない文字は除去
 */
function normalizeTag(input: string): { slug: string; name: string } | null {
  const name = input.trim().slice(0, MAX_TAG_LENGTH);
  if (!name) return null;

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-_]/gu, "");

  if (!slug) return null;
  return { slug, name };
}

export async function getTagBySlug(slug: string) {
  return prisma.paletteTag.findUnique({ where: { slug } });
}

/**
 * 人気タグを取得。作品のついてないタグは除外。
 */
export async function getPopularTags(limit = 20) {
  return prisma.paletteTag.findMany({
    where: { playCount: { gt: 0 } },
    orderBy: { playCount: "desc" },
    take: limit,
  });
}

/**
 * タグで絞り込んだ作品一覧。
 */
export async function getPlaysByTagSlug(slug: string, page = 1, perPage = 20) {
  const tag = await prisma.paletteTag.findUnique({ where: { slug } });
  if (!tag) return null;

  const where = {
    isPublished: true,
    tags: { some: { tagId: tag.id } },
  };

  const [plays, total] = await Promise.all([
    prisma.palettePlay.findMany({
      where,
      include: { genres: { include: { genre: true } } },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.palettePlay.count({ where }),
  ]);

  // author lookup
  const authorIds = [...new Set(plays.map((p) => p.authorId))];
  const authorMap = await getPublicUsersByIds(authorIds);

  return {
    tag,
    plays: plays.map((p) => ({
      ...p,
      author: authorMap.get(p.authorId) ?? unknownUser(p.authorId),
    })),
    total,
    totalPages: Math.ceil(total / perPage),
    currentPage: page,
  };
}

export async function getTagsForPlay(playId: string) {
  const rows = await prisma.palettePlayTag.findMany({
    where: { playId },
    include: { tag: true },
  });
  return rows.map((r) => r.tag);
}

const setTagsSchema = z.object({
  playId: z.string().min(1),
  tagNames: z.array(z.string()).max(MAX_TAGS_PER_PLAY),
});

/**
 * 作品のタグを一括更新。現在のセットを新しいセットで置き換える。
 * 新規タグは自動作成、使われなくなったタグは playCount を調整。
 * 作者のみ実行可能。
 */
export async function setPlayTagsForm(
  playId: string,
  _prev: unknown,
  formData: FormData
) {
  const rawTagNames = formData.getAll("tagNames").map((v) => String(v));
  return setPlayTags(playId, rawTagNames);
}

export async function setPlayTags(playId: string, rawTagNames: string[]) {
  const userId = await requireUserId();

  const parsed = setTagsSchema.safeParse({
    playId,
    tagNames: rawTagNames,
  });
  if (!parsed.success) return { error: "不正な入力です" };

  const play = await getPlayIfOwner(playId, userId);
  if (!play) return { error: "権限がありません" };

  // 正規化 + 重複排除
  const normalized: { slug: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const raw of rawTagNames) {
    const n = normalizeTag(raw);
    if (!n) continue;
    if (seen.has(n.slug)) continue;
    seen.add(n.slug);
    normalized.push(n);
  }

  await prisma.$transaction(async (tx) => {
    // 現在のタグIDを取得
    const current = await tx.palettePlayTag.findMany({
      where: { playId },
      select: { tagId: true },
    });
    const currentIds = new Set(current.map((c) => c.tagId));

    // 新しいタグ: slug ごとに upsert
    const newIds: number[] = [];
    for (const n of normalized) {
      const tag = await tx.paletteTag.upsert({
        where: { slug: n.slug },
        update: {}, // name は既存のを維持
        create: { slug: n.slug, name: n.name },
      });
      newIds.push(tag.id);
    }
    const newIdSet = new Set(newIds);

    // 追加
    const toAdd = newIds.filter((id) => !currentIds.has(id));
    if (toAdd.length > 0) {
      await tx.palettePlayTag.createMany({
        data: toAdd.map((tagId) => ({ playId, tagId })),
        skipDuplicates: true,
      });
    }

    // 削除
    const toRemove = [...currentIds].filter((id) => !newIdSet.has(id));
    if (toRemove.length > 0) {
      await tx.palettePlayTag.deleteMany({
        where: { playId, tagId: { in: toRemove } },
      });
    }

    // playCount を再計算(正確さ優先)
    const allTouched = [...new Set([...toAdd, ...toRemove])];
    for (const tagId of allTouched) {
      const c = await tx.palettePlayTag.count({ where: { tagId } });
      if (c === 0) {
        // 使われなくなったタグは削除
        await tx.paletteTag.delete({ where: { id: tagId } });
      } else {
        await tx.paletteTag.update({
          where: { id: tagId },
          data: { playCount: c },
        });
      }
    }
  });

  revalidatePath(`/plays/${playId}`);
  revalidatePath("/");
  return { success: true };
}
