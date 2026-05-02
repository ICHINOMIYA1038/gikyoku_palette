"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

type Props = {
  playId: string;
  title: string;
};

export function EditorHeader({ playId, title }: Props) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-3 py-1 shrink-0">
      <button
        type="button"
        onClick={() => router.push(`/dashboard/plays/${playId}/edit`)}
        className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
        閉じる
      </button>
      <span className="text-sm font-medium text-gray-900 truncate">
        {title}
      </span>
    </div>
  );
}
