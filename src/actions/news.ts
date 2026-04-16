"use server";

import { prisma } from "@/lib/db";

export type NewsKind = "new" | "update" | "performance";

export type NewsItem = {
  id: string;
  kind: NewsKind;
  /** 並べ替え基準日時（ISO） */
  at: string;
  /** 表示用にサーバ側で YYYY-MM-DD に固定（UTC ではなく JST 相当のローカル日付） */
  date: string;
  playId: string;
  playTitle: string;
  /** performance のみ: 上演主体（団体名） */
  performer?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const UPDATE_AFTER_PUBLISH_MS = 24 * 60 * 60 * 1000; // 公開から1日以降の更新だけ「更新」として出す

function toDateKey(d: Date): string {
  // Asia/Tokyo 基準で YYYY-MM-DD を作る（サーバのTZに依存しないように）
  const offset = 9 * 60 * 60 * 1000;
  const jst = new Date(d.getTime() + offset);
  return jst.toISOString().slice(0, 10);
}

/**
 * トップページ用の News フィード。
 *  - 新規追加: is_published=true & published_at が直近N日
 *  - 更新:     updated_at が直近N日、かつ published_at + 1日 以降
 *  - 上演予定: status=permitted の申請で、公演開始日が今日以降
 */
export async function getNews({
  days = 14,
  limit = 40,
}: { days?: number; limit?: number } = {}): Promise<NewsItem[]> {
  const since = new Date(Date.now() - days * DAY_MS);
  const now = new Date();

  const [newPlays, updatedPlays, performances] = await Promise.all([
    prisma.palettePlay.findMany({
      where: {
        isPublished: true,
        publishedAt: { gte: since },
      },
      orderBy: { publishedAt: "desc" },
      select: { id: true, title: true, publishedAt: true },
      take: limit,
    }),
    prisma.palettePlay.findMany({
      where: {
        isPublished: true,
        updatedAt: { gte: since },
        // updatedAt が publishedAt + 1日以降（＝公開後の更新）
        // Prisma は列比較ができないので raw に寄せる選択肢あり。ここではアプリ側で絞る
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        publishedAt: true,
      },
      take: limit * 2, // 公開直後の分が多数混ざるため少し多めに取る
    }),
    prisma.palettePermission.findMany({
      where: {
        status: "permitted",
        startDate: { gte: now },
        play: { isPublished: true },
      },
      orderBy: { reviewedAt: "desc" },
      select: {
        id: true,
        organizationName: true,
        reviewedAt: true,
        play: { select: { id: true, title: true } },
      },
      take: limit,
    }),
  ]);

  const items: NewsItem[] = [];

  for (const p of newPlays) {
    if (!p.publishedAt) continue;
    items.push({
      id: `new-${p.id}`,
      kind: "new",
      at: p.publishedAt.toISOString(),
      date: toDateKey(p.publishedAt),
      playId: p.id,
      playTitle: p.title,
    });
  }

  for (const p of updatedPlays) {
    if (!p.publishedAt) continue;
    // 公開直後の updatedAt は「新規追加」側で扱う
    if (p.updatedAt.getTime() - p.publishedAt.getTime() < UPDATE_AFTER_PUBLISH_MS) continue;
    items.push({
      id: `upd-${p.id}-${p.updatedAt.getTime()}`,
      kind: "update",
      at: p.updatedAt.toISOString(),
      date: toDateKey(p.updatedAt),
      playId: p.id,
      playTitle: p.title,
    });
  }

  for (const perm of performances) {
    const at = perm.reviewedAt ?? now;
    items.push({
      id: `perf-${perm.id}`,
      kind: "performance",
      at: at.toISOString(),
      date: toDateKey(at),
      playId: perm.play.id,
      playTitle: perm.play.title,
      performer: perm.organizationName,
    });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : -1));
  return items.slice(0, limit);
}
