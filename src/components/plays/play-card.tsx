import Link from "next/link";
import Image from "next/image";
import { Eye, Star } from "lucide-react";
import { NO_IMAGE_URL } from "@/lib/constants";
import { PlayMetaInline } from "@/components/plays/play-meta-inline";

type PlayCardProps = {
  id: string;
  title: string;
  authorName: string;
  authorId: string;
  synopsis: string;
  durationMinutes: number | null;
  castTotal: number | null;
  genres: { name: string }[];
  isFree: boolean;
  feeAmount: number;
  viewCount: number;
  avgRating?: number;
  reviewCount?: number;
  coverImageUrl?: string | null;
};

export function PlayCard({
  id, title, authorName, synopsis,
  durationMinutes, castTotal, genres,
  isFree, feeAmount, viewCount,
  avgRating, reviewCount, coverImageUrl,
}: PlayCardProps) {
  return (
    <Link href={`/plays/${id}`} className="block group">
      <div className="h-full rounded-lg border border-gray-200 bg-white transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden flex flex-col">
        <div className="relative aspect-[2/3] w-full">
          <Image
            src={coverImageUrl || NO_IMAGE_URL}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>

        <div className="px-5 py-3 space-y-2.5 flex-1">
          <p className="text-sm text-gray-500">{authorName}</p>

          <PlayMetaInline durationMinutes={durationMinutes} castTotal={castTotal} size="md" />

          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {genres.map((g) => (
                <span key={g.name} className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500">
                  {g.name}
                </span>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
            {synopsis.length > 100 ? synopsis.slice(0, 100) + "\u2026" : synopsis}
          </p>
        </div>

        <div className="mt-auto border-t border-gray-100 px-5 py-2.5 flex items-center justify-between text-xs text-gray-400">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {viewCount.toLocaleString()}
          </span>
          {reviewCount != null && reviewCount > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />
              {avgRating?.toFixed(1)}
              <span className="text-gray-400">({reviewCount})</span>
            </span>
          )}
          {isFree ? (
            <span className="text-emerald-600 font-medium">無料</span>
          ) : (
            <span className="font-medium">&yen;{feeAmount.toLocaleString()}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
