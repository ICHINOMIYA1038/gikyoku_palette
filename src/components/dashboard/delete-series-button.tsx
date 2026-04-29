"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteSeries } from "@/actions/series";

type Props = {
  seriesId: string;
  seriesTitle: string;
};

export function DeleteSeriesButton({ seriesId, seriesTitle }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        シリーズを削除
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-red-700">
        「{seriesTitle}」を削除します。よろしいですか？
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await deleteSeries(seriesId);
              if ("success" in res && res.success) {
                router.push("/dashboard/series");
              } else if ("error" in res) {
                setError(res.error as string);
              }
            });
          }}
          disabled={isPending}
          className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? "削除中..." : "削除する"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-3 text-xs text-gray-700 hover:bg-gray-50"
        >
          キャンセル
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
