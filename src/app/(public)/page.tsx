import { Suspense } from "react";
import Link from "next/link";
import { getPlays, getGenres, getStats } from "@/actions/plays";
import { getPopularPlays } from "@/actions/rankings";
import { getAuthors } from "@/actions/authors";
import { PlayCard } from "@/components/plays/play-card";
import { AuthorCard } from "@/components/authors/author-card";
import { SearchBar } from "@/components/plays/search-bar";
import { FilterPanel } from "@/components/plays/filter-panel";
import { SortSelector } from "@/components/plays/sort-selector";
import { Pagination } from "@/components/ui/pagination";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    duration?: string;
    cast?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const [
    { plays, total, totalPages, currentPage },
    { plays: popularPlays },
    { plays: newPlays },
    genres,
    stats,
    { authors: featuredAuthors },
  ] = await Promise.all([
    getPlays({
      search: params.q,
      genreSlug: params.genre,
      maxDuration: params.duration ? parseInt(params.duration) : undefined,
      maxCast: params.cast ? parseInt(params.cast) : undefined,
      sortBy:
        (params.sort as "newest" | "views" | "rating" | "downloads") ||
        "newest",
      page: params.page ? parseInt(params.page) : 1,
    }),
    getPlays({ sortBy: "views", perPage: 8 }),
    getPlays({ sortBy: "newest", perPage: 6 }),
    getGenres(),
    getStats(),
    getAuthors({ sort: "plays", perPage: 4 }),
  ]);

  return (
    <div>
      {/* ===== Hero Section ===== */}
      <section className="border-b border-gray-100">
        <div className="container mx-auto px-4 max-w-5xl py-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-gray-900 leading-tight">
            あなたの戯曲を、世界に届けよう
          </h1>
          <p className="mt-4 text-base md:text-lg text-gray-500 max-w-xl mx-auto">
            戯曲の投稿・検索・上演許可申請プラットフォーム
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#search"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-gray-900 px-6 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              作品を探す
            </a>
            <Link
              href="/dashboard/plays/new"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-6 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              作品を投稿する
            </Link>
          </div>
          <div className="mt-10 flex justify-center gap-8 text-sm text-gray-400">
            <span>
              <strong className="text-gray-700 font-semibold">
                {stats.playCount}
              </strong>{" "}
              作品
            </span>
            <span>
              <strong className="text-gray-700 font-semibold">
                {stats.authorCount}
              </strong>{" "}
              作家
            </span>
            <span>
              <strong className="text-gray-700 font-semibold">
                {stats.reviewCount}
              </strong>{" "}
              レビュー
            </span>
          </div>
        </div>
      </section>

      {/* ===== Genre Chips Section ===== */}
      {genres.length > 0 && (
        <section className="border-b border-gray-100 py-4">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {genres.map((genre) => (
                <Link
                  key={genre.id}
                  href={`/?genre=${genre.slug}`}
                  className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-pink-300 hover:text-pink-700 whitespace-nowrap text-sm transition-colors"
                >
                  {genre.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== Popular Plays Section ===== */}
      {popularPlays.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-900">
                人気の作品
              </h2>
              <Link
                href="/rankings"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                すべて見る →
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {popularPlays.slice(0, 6).map((play) => (
                <PlayCard
                  key={play.id}
                  id={play.id}
                  title={play.title}
                  authorName={play.author?.displayName || "不明"}
                  authorId={play.authorId}
                  synopsis={play.synopsis}
                  durationMinutes={play.durationMinutes}
                  castTotal={play.castTotal}
                  genres={play.genres.map((pg: any) => ({
                    name: pg.genre.name,
                  }))}
                  isFree={play.isFree}
                  feeAmount={play.feeAmount}
                  viewCount={play.viewCount}
                  avgRating={play.avgRating}
                  reviewCount={play.reviewCount}
                  coverImageUrl={play.coverImageUrl}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== New Plays Section ===== */}
      {newPlays.length > 0 && (
        <section className="py-12 md:py-16 bg-gray-50/50">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-900">
                新着作品
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {newPlays.map((play) => (
                <PlayCard
                  key={play.id}
                  id={play.id}
                  title={play.title}
                  authorName={play.author?.displayName || "不明"}
                  authorId={play.authorId}
                  synopsis={play.synopsis}
                  durationMinutes={play.durationMinutes}
                  castTotal={play.castTotal}
                  genres={play.genres.map((pg: any) => ({
                    name: pg.genre.name,
                  }))}
                  isFree={play.isFree}
                  feeAmount={play.feeAmount}
                  viewCount={play.viewCount}
                  avgRating={play.avgRating}
                  reviewCount={play.reviewCount}
                  coverImageUrl={play.coverImageUrl}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== Search Section ===== */}
      <section id="search" className="py-12 md:py-16 scroll-mt-4">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-lg md:text-xl font-serif font-bold text-gray-900 mb-8">
            作品を検索
          </h2>

          <div className="mb-6 space-y-4">
            <Suspense>
              <SearchBar />
            </Suspense>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Suspense>
                <FilterPanel genres={genres} />
              </Suspense>
              <Suspense>
                <SortSelector />
              </Suspense>
            </div>
          </div>

          {plays.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-gray-500">
                {total}件の作品が見つかりました
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {plays.map((play) => (
                  <PlayCard
                    key={play.id}
                    id={play.id}
                    title={play.title}
                    authorName={play.author?.displayName || "不明"}
                    authorId={play.authorId}
                    synopsis={play.synopsis}
                    durationMinutes={play.durationMinutes}
                    castTotal={play.castTotal}
                    genres={play.genres.map((pg: any) => ({
                      name: pg.genre.name,
                    }))}
                    isFree={play.isFree}
                    feeAmount={play.feeAmount}
                    viewCount={play.viewCount}
                    avgRating={play.avgRating}
                    reviewCount={play.reviewCount}
                    coverImageUrl={play.coverImageUrl}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  className="mt-8"
                />
              )}
            </>
          ) : (
            <div className="py-16 text-center">
              <p className="text-lg text-gray-500 mb-4">
                {params.q || params.genre || params.duration || params.cast
                  ? "条件に合う作品が見つかりませんでした。条件を変更してお試しください。"
                  : "まだ作品が登録されていません。"}
              </p>
              {!(
                params.q ||
                params.genre ||
                params.duration ||
                params.cast
              ) && (
                <Link
                  href="/dashboard/plays/new"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-gray-900 px-6 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                >
                  最初の作品を投稿する
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ===== Featured Authors Section ===== */}
      {featuredAuthors.length > 0 && (
        <section className="py-12 md:py-16 bg-gray-50/50">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-baseline justify-between mb-8">
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-900">
                注目の作家
              </h2>
              <Link
                href="/authors"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                すべて見る →
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredAuthors.map((author) => (
                <AuthorCard
                  key={author.id}
                  id={author.id}
                  displayName={author.displayName}
                  avatarUrl={author.avatarUrl}
                  bio={author.bio}
                  playCount={author.play_count}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
