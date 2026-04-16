"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleBookmark } from "@/actions/bookmarks";

type Props = {
  playId: string;
  initialBookmarked: boolean;
  initialCount: number;
  /** 未ログイン時のリダイレクト先（既定: 同じページに戻す） */
  loginRedirectTo?: string;
};

/**
 * 作品の ハート / ブックマークボタン。
 * 楽観的に状態とカウントを更新し、サーバ結果で同期する。
 */
export function BookmarkButton({
  playId,
  initialBookmarked,
  initialCount,
  loginRedirectTo,
}: Props) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    // 楽観的更新
    const next = !bookmarked;
    setBookmarked(next);
    setCount((c) => c + (next ? 1 : -1));

    startTransition(async () => {
      const res = await toggleBookmark(playId);
      // サーバが redirect("/login") した場合 res は throw / 復帰せず、
      // 通常はここでサーバ確定値で同期
      if ("bookmarked" in res) {
        setBookmarked(res.bookmarked);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-all ${
        bookmarked
          ? "bg-pink-50 text-pink-600 ring-1 ring-pink-200 hover:bg-pink-100"
          : "border border-gray-200 bg-white text-gray-600 hover:border-pink-200 hover:text-pink-500"
      } ${pending ? "opacity-70" : ""}`}
      aria-pressed={bookmarked}
    >
      <Heart
        className={`h-4 w-4 transition-transform ${
          bookmarked ? "fill-pink-500 text-pink-500 scale-110" : ""
        }`}
      />
      <span>{count.toLocaleString()}</span>
    </button>
  );
}
