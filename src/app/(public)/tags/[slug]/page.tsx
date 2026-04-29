import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Hash } from "lucide-react";
import { getPlaysByTagSlug, getPopularTags } from "@/actions/tags";
import { PlayCard } from "@/components/plays/play-card";
import { Pagination } from "@/components/ui/pagination";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  return {
    title: `#${decoded} の作品`,
    description: `タグ「${decoded}」が付けられた戯曲の一覧`,
  };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr || "1", 10) || 1);
  const decoded = decodeURIComponent(slug);

  const data = await getPlaysByTagSlug(decoded, page);
  if (!data) notFound();

  return (
    <div>
      {/* Header */}
      <div className="border-b border-gray-100 bg-gradient-to-b from-pink-50/40 to-white">
        <div className="container mx-auto max-w-5xl px-4 py-10">
          <p className="text-xs font-medium uppercase tracking-wider text-pink-600 mb-1">
            Tag
          </p>
          <h1 className="inline-flex items-center gap-2 text-2xl md:text-3xl font-bold font-serif text-gray-900">
            <Hash className="h-6 w-6 text-pink-500" />
            {data.tag.name}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {data.total} 件の作品にこのタグが付けられています
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        {data.plays.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.plays.map((play) => (
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
            {data.totalPages > 1 && (
              <Pagination
                currentPage={data.currentPage}
                totalPages={data.totalPages}
                className="mt-8"
              />
            )}
          </>
        ) : (
          <div className="py-16 text-center">
            <Hash className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-4 text-sm text-gray-500">
              このタグの作品はまだありません。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
