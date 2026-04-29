import Link from "next/link";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

type Props = {
  series: { id: string; title: string } | null;
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  total: number;
  current: number;
};

export function SeriesNav({ series, prev, next, total, current }: Props) {
  if (!series) return null;

  return (
    <div className="rounded-lg border border-pink-200 bg-gradient-to-br from-pink-50 to-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-pink-600">
            Series
          </p>
          <Link
            href={`/series/${series.id}`}
            className="mt-0.5 flex items-center gap-1.5 font-serif text-sm font-bold text-gray-900 hover:text-pink-700 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0 text-pink-500" />
            <span className="truncate">{series.title}</span>
          </Link>
          <p className="mt-0.5 text-xs text-gray-500">
            {current} / {total} 作目
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {prev ? (
          <Link
            href={`/plays/${prev.id}`}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 hover:border-pink-300 hover:text-pink-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">{prev.title}</span>
          </Link>
        ) : (
          <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-2 text-xs text-gray-300">
            <ChevronLeft className="h-4 w-4 shrink-0" />
            最初の作品
          </span>
        )}
        {next ? (
          <Link
            href={`/plays/${next.id}`}
            className="flex min-w-0 flex-1 items-center justify-end gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 hover:border-pink-300 hover:text-pink-700 transition-colors"
          >
            <span className="truncate">{next.title}</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </Link>
        ) : (
          <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5 rounded-md border border-gray-100 bg-gray-50 px-2.5 py-2 text-xs text-gray-300">
            最後の作品
            <ChevronRight className="h-4 w-4 shrink-0" />
          </span>
        )}
      </div>
    </div>
  );
}
