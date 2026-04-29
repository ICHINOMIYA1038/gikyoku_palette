import Link from "next/link";
import { getRankings } from "@/actions/rankings";
import { Eye, Star, Download, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "ランキング",
};

type RankingType = "views" | "rating" | "downloads";

const TABS: { value: RankingType; label: string; icon: React.ReactNode }[] = [
  { value: "views", label: "閲覧数", icon: <Eye className="h-4 w-4" /> },
  { value: "rating", label: "評価", icon: <Star className="h-4 w-4" /> },
  {
    value: "downloads",
    label: "ダウンロード数",
    icon: <Download className="h-4 w-4" />,
  },
];

function getStatLabel(play: any, type: RankingType): string {
  switch (type) {
    case "rating":
      return `${play.avgRating?.toFixed(1) ?? "-"} (${play.reviewCount ?? 0}件)`;
    case "downloads":
      return `${(play.downloadCount ?? 0).toLocaleString()} DL`;
    case "views":
    default:
      return `${(play.viewCount ?? 0).toLocaleString()} 回閲覧`;
  }
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const type = (
    ["views", "rating", "downloads"].includes(params.type || "")
      ? params.type
      : "views"
  ) as RankingType;

  const rankings = await getRankings(type);

  const topThree = rankings.filter((p) => p.rank <= 3);
  const rest = rankings.filter((p) => p.rank > 3);

  return (
    <div>
      {/* Header */}
      <div className="border-b border-gray-100 bg-gradient-to-b from-pink-50/40 to-white">
        <div className="container mx-auto max-w-4xl px-4 py-10">
          <p className="text-xs font-medium uppercase tracking-wider text-pink-600 mb-1">
            Rankings
          </p>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-gray-900">
            人気作品ランキング
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            閲覧数・評価・ダウンロード数で戯曲パレットの人気作品を見る
          </p>

          {/* Pill Tabs */}
          <div className="mt-6 flex gap-1 rounded-lg bg-white border border-gray-200 p-1 w-fit shadow-sm">
            {TABS.map((tab) => (
              <Link
                key={tab.value}
                href={`/rankings?type=${tab.value}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all",
                  type === tab.value
                    ? "bg-pink-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                {tab.icon}
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        {rankings.length > 0 ? (
          <div className="space-y-8">
            {/* Top 3 */}
            {topThree.length > 0 && (
              <div className="space-y-4">
                {topThree.map((play) => (
                  <Link
                    key={play.id}
                    href={`/plays/${play.id}`}
                    className="block"
                  >
                    <div
                      className={cn(
                        "rounded-lg border bg-white transition-all hover:shadow-md p-5 flex gap-4 items-start",
                        play.rank === 1 && "border-amber-300 ring-1 ring-amber-100",
                        play.rank === 2 && "border-gray-300",
                        play.rank === 3 && "border-orange-300"
                      )}
                    >
                      {/* Rank Badge */}
                      <span
                        className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-full text-base font-bold shrink-0 shadow-sm",
                          play.rank === 1 &&
                            "bg-amber-400 text-white",
                          play.rank === 2 &&
                            "bg-gray-400 text-white",
                          play.rank === 3 &&
                            "bg-orange-400 text-white"
                        )}
                      >
                        {play.rank}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif text-xl font-semibold truncate text-gray-900">
                          {play.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {play.author.displayName}
                        </p>
                        <div className="flex gap-3 text-xs text-gray-400 mt-2">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {play.durationMinutes}分
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {play.castTotal}人
                          </span>
                          <span className="font-medium text-gray-700">
                            {getStatLabel(play, type)}
                          </span>
                        </div>
                        {play.synopsis && (
                          <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                            {play.synopsis}
                          </p>
                        )}
                      </div>

                      {/* Cover Thumbnail */}
                      {play.coverImageUrl && (
                        <div className="hidden sm:block shrink-0 w-20 h-20 rounded-md overflow-hidden">
                          <img
                            src={play.coverImageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* 4th and below */}
            {rest.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
                {rest.map((play) => (
                  <Link
                    key={play.id}
                    href={`/plays/${play.id}`}
                    className="flex items-center gap-3 sm:gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    {/* Rank */}
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 shrink-0">
                      {play.rank}
                    </span>

                    {/* Cover Thumbnail */}
                    <div className="hidden sm:block h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
                      {play.coverImageUrl ? (
                        <img
                          src={play.coverImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-serif text-base text-gray-300">
                          {play.title.slice(0, 1)}
                        </div>
                      )}
                    </div>

                    {/* Title + Meta */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm text-gray-900">
                        {play.title}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {play.author.displayName}
                      </p>
                      <div className="mt-0.5 flex items-center gap-3 text-[11px] text-gray-400">
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {play.durationMinutes}分
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <Users className="h-3 w-3" />
                          {play.castTotal}人
                        </span>
                      </div>
                    </div>

                    {/* Stat */}
                    <span className="text-sm text-gray-700 whitespace-nowrap font-medium shrink-0">
                      {getStatLabel(play, type)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-lg text-gray-500">
              まだランキングデータがありません。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
