import type { Metadata } from "next";
import Link from "next/link";
import { getAuthors } from "@/actions/authors";
import { AuthorCard } from "@/components/authors/author-card";
import { Users } from "lucide-react";

export const metadata: Metadata = {
  title: "作家一覧",
  description:
    "戯曲パレットで活動する劇作家の一覧。作品数・新着・50音順で探せます。",
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
    <div>
      {/* Header */}
      <div className="border-b border-gray-100 bg-gradient-to-b from-pink-50/40 to-white">
        <div className="container mx-auto max-w-5xl px-4 py-10">
          <p className="text-xs font-medium uppercase tracking-wider text-pink-600 mb-1">
            Authors
          </p>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-gray-900">
            作家一覧
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            戯曲パレットで作品を公開している劇作家たち
          </p>

          {/* Sort tabs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex gap-1 rounded-lg bg-white border border-gray-200 p-1 shadow-sm">
              {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                <Link
                  key={key}
                  href={`/authors?sort=${key}`}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    sort === key
                      ? "bg-pink-500 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {sortLabels[key]}
                </Link>
              ))}
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <Users className="h-3.5 w-3.5" />
              {total}名
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        {authors.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {authors.map((author) => (
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
              <div className="mt-10 flex items-center justify-center gap-4">
                {currentPage > 1 ? (
                  <Link
                    href={`/authors?sort=${sort}&page=${currentPage - 1}`}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    ← 前へ
                  </Link>
                ) : (
                  <span className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-300">
                    ← 前へ
                  </span>
                )}

                <span className="text-sm text-gray-500">
                  {currentPage} / {totalPages}
                </span>

                {currentPage < totalPages ? (
                  <Link
                    href={`/authors?sort=${sort}&page=${currentPage + 1}`}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    次へ →
                  </Link>
                ) : (
                  <span className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-300">
                    次へ →
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="py-20 text-center">
            <Users className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">
              まだ作品を公開している作家がいません。
            </p>
            <Link
              href="/dashboard/plays/new"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-gray-900 px-6 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              最初の作品を投稿する
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
