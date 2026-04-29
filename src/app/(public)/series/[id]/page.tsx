import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Clock, Users } from "lucide-react";
import { getSeriesById } from "@/actions/series";
import { truncateText } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const series = await getSeriesById(id, { publishedOnly: true });
  if (!series) return { title: "シリーズが見つかりません" };

  return {
    title: series.title,
    description: series.description
      ? truncateText(series.description, 160)
      : `${series.author?.displayName ?? "作者不明"}の連作戯曲シリーズ`,
  };
}

export default async function SeriesDetailPage({ params }: Props) {
  const { id } = await params;
  const series = await getSeriesById(id, { publishedOnly: true });

  if (!series) notFound();

  const authorName = series.author?.displayName ?? "不明な作者";

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-pink-50/40 to-white">
        <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
          <p className="text-xs font-medium uppercase tracking-wider text-pink-600 mb-1">
            Series
          </p>
          <div className="flex flex-col md:flex-row md:items-start md:gap-8">
            {series.coverImageUrl && (
              <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-lg bg-gray-100 shadow-sm">
                <Image
                  src={series.coverImageUrl}
                  alt={series.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            )}
            <div className="mt-4 md:mt-0 min-w-0 flex-1">
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900">
                {series.title}
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                <Link
                  href={`/authors/${series.author?.id}`}
                  className="hover:text-pink-600 transition-colors"
                >
                  {authorName}
                </Link>
                <span className="mx-2 text-gray-300">·</span>
                全 {series.plays.length} 作品
              </p>
              {series.description && (
                <p className="mt-4 text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {series.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Play list */}
      <section className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
        {series.plays.length > 0 ? (
          <ol className="space-y-3">
            {series.plays.map((play, i) => (
              <li key={play.id}>
                <Link
                  href={`/plays/${play.id}`}
                  className="group flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 md:p-5 transition-all hover:border-pink-200 hover:shadow-md"
                >
                  {/* Order number */}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-pink-200 font-serif text-base font-bold text-pink-700">
                    {play.seriesOrder ?? i + 1}
                  </span>

                  {/* Cover */}
                  <div className="hidden sm:block h-16 w-16 shrink-0 overflow-hidden rounded bg-gray-100">
                    {play.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={play.coverImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-serif text-xl text-gray-300">
                        {play.title.slice(0, 1)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-lg font-semibold text-gray-900 group-hover:text-pink-700 transition-colors">
                      {play.title}
                    </h3>
                    {play.synopsis && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {play.synopsis}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {play.durationMinutes}分
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {play.castTotal}人
                      </span>
                      <span className="font-medium text-gray-600">
                        {play.isFree ? "無料" : `¥${play.feeAmount.toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">
              このシリーズにはまだ公開作品がありません。
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
