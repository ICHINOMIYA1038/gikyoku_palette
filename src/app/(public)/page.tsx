import { Suspense } from "react";
import { getPlays, getGenres } from "@/actions/plays";
import { PlayCard } from "@/components/plays/play-card";
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
  const [{ plays, total, totalPages, currentPage }, genres] = await Promise.all(
    [
      getPlays({
        search: params.q,
        genreSlug: params.genre,
        maxDuration: params.duration ? parseInt(params.duration) : undefined,
        maxCast: params.cast ? parseInt(params.cast) : undefined,
        sortBy: (params.sort as "newest" | "views") || "newest",
        page: params.page ? parseInt(params.page) : 1,
      }),
      getGenres(),
    ]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">戯曲を探す</h1>
        <p className="text-muted-foreground">
          上演したい戯曲を見つけて、上演許可を申請しましょう
        </p>
      </div>

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
          <p className="mb-4 text-sm text-muted-foreground">
            {total}件の作品が見つかりました
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {plays.map((play) => (
              <PlayCard
                key={play.id}
                id={play.id}
                title={play.title}
                authorName={play.author.displayName}
                authorId={play.author.id}
                synopsis={play.synopsis}
                durationMinutes={play.durationMinutes}
                castTotal={play.castTotal}
                genres={play.genres.map((pg) => ({ name: pg.genre.name }))}
                isFree={play.isFree}
                feeAmount={play.feeAmount}
                viewCount={play.viewCount}
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
          <p className="text-lg text-muted-foreground">
            {params.q || params.genre || params.duration || params.cast
              ? "条件に合う作品が見つかりませんでした。条件を変更してお試しください。"
              : "まだ作品が登録されていません。"}
          </p>
        </div>
      )}
    </div>
  );
}
