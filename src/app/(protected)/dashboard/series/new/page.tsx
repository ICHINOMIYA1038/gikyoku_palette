import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SeriesForm } from "@/components/dashboard/series-form";

export const metadata: Metadata = {
  title: "新しいシリーズ",
};

export default function NewSeriesPage() {
  return (
    <div>
      <Link
        href="/dashboard/series"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        シリーズ一覧
      </Link>
      <h1 className="font-serif text-xl font-bold text-gray-900 mb-1">
        新しいシリーズ
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        シリーズ作成後、各作品の編集画面でシリーズを設定できます。
      </p>

      <SeriesForm mode="create" />
    </div>
  );
}
