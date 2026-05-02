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
        className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-900"
        title="エディタを閉じる"
      >
        <X className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium text-gray-900 truncate">
        {title}
      </span>
    </div>
  );
}
