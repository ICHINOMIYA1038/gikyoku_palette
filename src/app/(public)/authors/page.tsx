import type { Metadata } from "next";
import Link from "next/link";
import { getAuthors } from "@/actions/authors";
import { AuthorCard } from "@/components/authors/author-card";

export const metadata: Metadata = {
  title: "作家一覧",
};

type SortOption = "newest" | "plays" | "alphabetical";

const sortLabels: Record<SortOption, string> = {
  plays: "作品数順",
  newest: "新着順",
  alphabetical: "50音順",
};

type Props = {
  searchParams: Promise<{ sort?: string; page?: string }>;
};

export default async function AuthorsPage({ searchParams }: Props) {
  const params = await searchParams;
  const sort = (["newest", "plays", "alphabetical"].includes(params.sort || "")
    ? params.sort
    : "plays") as SortOption;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const { authors, total, totalPages, currentPage } = await getAuthors({
    sort,
    page,
  });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold font-serif">作家一覧</h1>

      {/* Sort tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(Object.keys(sortLabels) as SortOption[]).map((key) => (
          <Link
            key={key}
            href={`/authors?sort=${key}`}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              sort === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {sortLabels[key]}
          </Link>
        ))}
      </div>

      {authors.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author: any) => (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              {currentPage > 1 ? (
                <Link
                  href={`/authors?sort=${sort}&page=${currentPage - 1}`}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                >
                  前へ
                </Link>
              ) : (
                <span className="rounded-md border px-4 py-2 text-sm text-muted-foreground opacity-50">
                  前へ
                </span>
              )}

              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>

              {currentPage < totalPages ? (
                <Link
                  href={`/authors?sort=${sort}&page=${currentPage + 1}`}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                >
                  次へ
                </Link>
              ) : (
                <span className="rounded-md border px-4 py-2 text-sm text-muted-foreground opacity-50">
                  次へ
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-muted-foreground">
          まだ作品を公開している作家がいません。
        </p>
      )}
    </div>
  );
}
