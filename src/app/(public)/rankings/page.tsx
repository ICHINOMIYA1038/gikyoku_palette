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
      <div className="border-b border-gray-100">
        <div className="container mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-gray-900 mb-6">
            ランキング
          </h1>

          {/* Pill Tabs */}
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
            {TABS.map((tab) => (
              <Link
                key={tab.value}
                href={`/rankings?type=${tab.value}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all",
                  type === tab.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
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
                    <div className="rounded-lg border border-gray-200 bg-white transition-all hover:shadow-md p-5 flex gap-4 items-start">
                      {/* Rank Badge */}
                      <span
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0",
                          play.rank === 1 &&
                            "bg-amber-100 text-amber-700",
                          play.rank === 2 &&
                            "bg-gray-100 text-gray-600",
                          play.rank === 3 &&
                            "bg-orange-100 text-orange-700"
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
              <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                {rest.map((play) => (
                  <Link
                    key={play.id}
                    href={`/plays/${play.id}`}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="w-8 text-center text-sm font-medium text-gray-400 shrink-0">
                      {play.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm text-gray-900">
                        {play.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {play.author.displayName}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500 whitespace-nowrap font-medium shrink-0">
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
