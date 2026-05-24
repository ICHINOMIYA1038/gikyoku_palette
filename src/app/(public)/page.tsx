import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPlays, getGenres, getStats } from "@/actions/plays";
import { getAuthors } from "@/actions/authors";
import { getNews } from "@/actions/news";
import { getPopularTags } from "@/actions/tags";
import Image from "next/image";
import { PlayCard } from "@/components/plays/play-card";
import { AuthorCard } from "@/components/authors/author-card";
import { SearchBar } from "@/components/plays/search-bar";
import { FilterPanel } from "@/components/plays/filter-panel";
import { SortSelector } from "@/components/plays/sort-selector";
import { Pagination } from "@/components/ui/pagination";
import { NewsFeed } from "@/components/home/news-feed";
import { HomePopular } from "@/components/home/home-popular";
import { HomeSidebar } from "@/components/home/home-sidebar";
import { Landing } from "@/components/home/landing";

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
  const session = await auth();
  const loggedIn = !!session?.user?.id;

  // 未ログインかつ検索条件無しならランディングページ
  const hasFilters = !!(params.q || params.genre || params.duration || params.cast);
  if (!loggedIn && !hasFilters) {
    const stats = await getStats();
    return <Landing stats={stats} />;
  }

  let userName: string | null = null;
  if (session?.user?.id) {
    const rows = await prisma.$queryRaw<Array<{ displayName: string | null; name: string | null }>>`
      SELECT "displayName", name FROM "public"."User" WHERE id = ${session.user.id}
    `;
    userName = rows[0]?.displayName || rows[0]?.name || "マイページ";
  }

  const [
    { plays, total, totalPages, currentPage },
    { plays: popularPlays },
    { plays: newPlays },
    genres,
    stats,
    { authors: featuredAuthors },
    news,
    popularTags,
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
    getPlays({ sortBy: "views", perPage: 10 }),
    getPlays({ sortBy: "newest", perPage: 6 }),
    getGenres(),
    getStats(),
    getAuthors({ sort: "plays", perPage: 4 }),
    getNews({ days: 7, limit: 15 }),
    getPopularTags(20),
  ]);

  const popularForList = popularPlays.slice(0, 8).map((p) => ({
    id: p.id,
    title: p.title,
    coverImageUrl: p.coverImageUrl,
    authorName: p.author?.displayName || "不明",
    durationMinutes: p.durationMinutes,
    castTotal: p.castTotal,
    isFree: p.isFree,
    feeAmount: p.feeAmount,
    viewCount: p.viewCount,
    avgRating: p.avgRating,
    reviewCount: p.reviewCount,
  }));

  return (
    <div>
      {/* ===== Beta Notice Banner ===== */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm text-amber-800">
        本サービスはベータ版です。予告なくサービスを終了する場合があります。
      </div>

      {/* ===== 3-Column Top Section ===== */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-pink-50/40 to-white">
        <div className="container mx-auto max-w-6xl px-4 py-6 md:py-8">
          {/* 小さなページ見出し (モバイルのみ) */}
          <div className="mb-4 text-center lg:hidden">
            <h1 className="font-serif text-2xl font-bold text-gray-900">
              戯曲パレット
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              作家と劇団をつなぐ、戯曲のプラットフォーム
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-6">
            {/* 左: News */}
            <div className="order-3 lg:order-1">
              {news.length > 0 ? (
                <NewsFeed items={news} />
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-sm text-gray-400">
                  まだニュースはありません
                </div>
              )}
            </div>

            {/* 中央: 人気作品 */}
            <div className="order-1 lg:order-2">
              {popularForList.length > 0 ? (
                <HomePopular plays={popularForList} />
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
                  まだ作品がありません
                </div>
              )}
            </div>

            {/* 右: コンセプト + CTA + Stats */}
            <div className="order-2 lg:order-3">
              <HomeSidebar
                loggedIn={loggedIn}
                userName={userName}
                stats={stats}
                authors={featuredAuthors.slice(0, 4).map((a) => ({
                  id: a.id,
                  displayName: a.displayName,
                  avatarUrl: a.avatarUrl,
                  playCount: a.play_count ?? 0,
                }))}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== Genre Chips ===== */}
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

      {/* ===== Popular Tags ===== */}
      {popularTags.length > 0 && (
        <section className="border-b border-gray-100 py-4">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3">
              <p className="shrink-0 text-xs font-medium uppercase tracking-wider text-pink-600">
                Tags
              </p>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {popularTags.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tags/${t.slug}`}
                    className="inline-flex items-center rounded-full bg-pink-50 border border-pink-100 px-2.5 py-0.5 text-xs font-medium text-pink-700 hover:bg-pink-100 whitespace-nowrap transition-colors"
                  >
                    #{t.name}
                    <span className="ml-1 text-pink-400">{t.playCount}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== New Plays Section ===== */}
      {newPlays.length > 0 && (
        <section className="py-10 md:py-14 bg-gray-50/50">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-baseline justify-between mb-6">
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
                  genres={play.genres.map((pg) => ({
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
      <section id="search" className="py-10 md:py-14 scroll-mt-4">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-lg md:text-xl font-serif font-bold text-gray-900 mb-6">
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
                    genres={play.genres.map((pg) => ({
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
                loggedIn ? (
                  <Link
                    href="/dashboard/plays/new"
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-gray-900 px-6 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                  >
                    最初の作品を投稿する
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-gray-900 px-6 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                  >
                    ログインして投稿する
                  </Link>
                )
              )}
            </div>
          )}
        </div>
      </section>

      {/* ===== 戯曲図書館バナー ===== */}
      <section className="py-8 md:py-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <a
            href="https://gikyokutosyokan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block cursor-pointer transition-opacity hover:opacity-90"
          >
            <Image
              src="https://gikyokutosyokan-public.s3.ap-northeast-1.amazonaws.com/assets/banners/tosyokan-wide.png"
              alt="戯曲図書館"
              width={970}
              height={250}
              className="mx-auto h-auto w-full max-w-[970px] rounded-lg"
            />
          </a>
        </div>
      </section>

      {/* ===== Featured Authors Section ===== */}
      {featuredAuthors.length > 0 && (
        <section className="py-10 md:py-14 bg-gray-50/50">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-baseline justify-between mb-6">
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
