import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Library, BookOpen } from "lucide-react";
import { listMySeries } from "@/actions/series";

export const metadata: Metadata = {
  title: "シリーズ管理",
};

export default async function DashboardSeriesPage() {
  const series = await listMySeries();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-xl font-bold text-gray-900">
            シリーズ管理
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            連作戯曲をグループにまとめられます
          </p>
        </div>
        <Link
          href="/dashboard/series/new"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-pink-500 px-4 text-sm font-medium text-white hover:bg-pink-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          新しいシリーズ
        </Link>
      </div>

      {series.length > 0 ? (
        <ul className="space-y-3">
          {series.map((s) => (
            <li key={s.id}>
              <Link
                href={`/dashboard/series/${s.id}`}
                className="group flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-pink-200 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-pink-200 text-pink-700">
                  <Library className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-base font-bold text-gray-900 group-hover:text-pink-700 transition-colors truncate">
                    {s.title}
                  </h3>
                  {s.description && (
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                      {s.description}
                    </p>
                  )}
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-400">
                    <BookOpen className="h-3 w-3" />
                    {s._count.plays} 作品
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center">
          <Library className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            まだシリーズがありません
          </p>
          <p className="mt-1 text-xs text-gray-400">
            連作戯曲や三部作をグループにまとめておくと、読者が前後の作品へスムーズに移動できます。
          </p>
          <Link
            href="/dashboard/series/new"
            className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            最初のシリーズを作る
          </Link>
        </div>
      )}
    </div>
  );
}
