import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, BookOpen } from "lucide-react";
import { auth } from "@/lib/auth";
import { getSeriesById } from "@/actions/series";
import { SeriesForm } from "@/components/dashboard/series-form";
import { DeleteSeriesButton } from "@/components/dashboard/delete-series-button";

export const metadata: Metadata = {
  title: "シリーズの編集",
};

type Props = { params: Promise<{ id: string }> };

export default async function EditSeriesPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const series = await getSeriesById(id);
  if (!series) notFound();
  if (series.authorId !== session.user.id) redirect("/dashboard/series");

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/series"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          シリーズ一覧
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-xl font-bold text-gray-900 truncate">
              {series.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {series.plays.length} 作品 登録
            </p>
          </div>
          <Link
            href={`/series/${series.id}`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            公開ページを見る
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Form */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">基本情報</h2>
        <SeriesForm
          mode="edit"
          seriesId={series.id}
          initial={{
            title: series.title,
            description: series.description,
            coverImageUrl: series.coverImageUrl,
          }}
        />
      </section>

      {/* 登録作品 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">登録作品</h2>
        {series.plays.length > 0 ? (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {series.plays.map((play, i) => (
              <li key={play.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-semibold text-pink-700">
                  {play.seriesOrder ?? i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {play.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {play.isPublished ? "公開中" : "下書き"}
                  </p>
                </div>
                <Link
                  href={`/dashboard/plays/${play.id}/edit`}
                  className="text-xs text-gray-500 hover:text-pink-600"
                >
                  編集 →
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
            <BookOpen className="mx-auto h-7 w-7 text-gray-300" />
            <p className="mt-2 text-xs text-gray-500">
              各作品の編集画面で、このシリーズを選択してください。
            </p>
          </div>
        )}
      </section>

      {/* 危険ゾーン */}
      <section className="rounded-lg border border-red-200 bg-red-50/40 p-4">
        <h2 className="text-sm font-semibold text-red-700">危険な操作</h2>
        <p className="mt-1 text-xs text-red-600/80">
          シリーズを削除しても、作品自体は残ります（グループ解除のみ）。
        </p>
        <div className="mt-3">
          <DeleteSeriesButton seriesId={series.id} seriesTitle={series.title} />
        </div>
      </section>
    </div>
  );
}
