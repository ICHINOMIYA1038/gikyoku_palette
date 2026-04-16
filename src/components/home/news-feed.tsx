/**
 * トップページの「News」フィード。
 * 日付ごとにグループ化し、各行に種別バッジ＋作品リンクを並べる。
 */

import Link from "next/link";
import type { NewsItem, NewsKind } from "@/actions/news";

const KIND_STYLES: Record<NewsKind, { label: string; className: string }> = {
  new: {
    label: "New!!",
    className: "bg-rose-500 text-white",
  },
  update: {
    label: "Up!!",
    className: "bg-sky-500 text-white",
  },
  performance: {
    label: "Play!",
    className: "bg-amber-500 text-white",
  },
};

function Badge({ kind }: { kind: NewsKind }) {
  const s = KIND_STYLES[kind];
  return (
    <span
      className={`inline-flex h-5 w-12 shrink-0 items-center justify-center rounded text-[10px] font-bold tracking-wider ${s.className}`}
    >
      {s.label}
    </span>
  );
}

export function NewsFeed({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 py-6">
        まだニュースはありません
      </p>
    );
  }

  // 日付ごとにグループ化（昇順 Map のため push 順で良い）
  const groups = new Map<string, NewsItem[]>();
  for (const item of items) {
    if (!groups.has(item.date)) groups.set(item.date, []);
    groups.get(item.date)!.push(item);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <header className="bg-pink-100/70 px-4 py-2 text-center text-sm font-bold text-pink-900">
        News
      </header>
      <div className="divide-y divide-gray-100">
        {Array.from(groups.entries()).map(([date, rows]) => (
          <div key={date} className="flex gap-3 px-4 py-2">
            <time className="w-12 shrink-0 pt-0.5 text-xs text-gray-500">
              {formatDate(date)}
            </time>
            <ul className="flex-1 space-y-1">
              {rows.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <Badge kind={item.kind} />
                  <p className="leading-snug text-gray-800">
                    <Link
                      href={`/plays/${item.playId}`}
                      className="font-medium text-sky-700 underline-offset-2 hover:underline"
                    >
                      {item.playTitle}
                    </Link>
                    <span>{descriptionFor(item)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function descriptionFor(item: NewsItem): string {
  switch (item.kind) {
    case "new":
      return "が新規追加されました。";
    case "update":
      return "が更新されました。";
    case "performance":
      return item.performer
        ? `が${item.performer}さんによって上演されるそうです。`
        : "の上演が決定しました。";
  }
}

function formatDate(yyyyMmDd: string): string {
  // "2026-04-17" → "04/17"
  const parts = yyyyMmDd.split("-");
  if (parts.length !== 3) return yyyyMmDd;
  return `${parts[1]}/${parts[2]}`;
}
