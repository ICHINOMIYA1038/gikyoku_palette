/**
 * トップページ中央カラム。人気作品ランキング形式で縦積み表示。
 */

import Link from "next/link";
import Image from "next/image";
import { Eye, Star, Clock, Users } from "lucide-react";

type Play = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  authorName: string;
  durationMinutes: number;
  castTotal: number;
  isFree: boolean;
  feeAmount: number;
  viewCount: number;
  avgRating: number;
  reviewCount: number;
};

export function HomePopular({ plays }: { plays: Play[] }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <header className="flex items-baseline justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="font-serif text-base font-bold text-gray-900">
          人気の作品
        </h2>
        <Link
          href="/rankings"
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          ランキング →
        </Link>
      </header>

      <ol className="divide-y divide-gray-100">
        {plays.map((p, i) => (
          <li key={p.id}>
            <Link
              href={`/plays/${p.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              {/* 順位 */}
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  i < 3
                    ? "bg-pink-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {i + 1}
              </span>

              {/* カバー */}
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-gray-100">
                {p.coverImageUrl ? (
                  <Image
                    src={p.coverImageUrl}
                    alt=""
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-serif text-xl text-gray-300">
                    {p.title.slice(0, 1)}
                  </div>
                )}
              </div>

              {/* 本文 */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {p.title}
                </p>
                <p className="truncate text-xs text-gray-500">{p.authorName}</p>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="inline-flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {p.durationMinutes}分
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Users className="h-3 w-3" />
                    {p.castTotal}人
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Eye className="h-3 w-3" />
                    {p.viewCount.toLocaleString()}
                  </span>
                  {p.avgRating > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-amber-500">
                      <Star className="h-3 w-3 fill-current" />
                      {p.avgRating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              {/* 料金 */}
              <span className="shrink-0 text-xs font-medium text-gray-600">
                {p.isFree ? "無料" : `¥${p.feeAmount.toLocaleString()}`}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
