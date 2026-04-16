"use client";

import { useState, useTransition } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { toggleFollow } from "@/actions/follows";

type Props = {
  authorId: string;
  initialFollowing: boolean;
  initialCount: number;
};

/**
 * 作家フォローボタン。
 * 楽観更新で押下感を即時化、サーバ確定値で同期する。
 */
export function FollowButton({ authorId, initialFollowing, initialCount }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    const next = !following;
    setFollowing(next);
    setCount((c) => c + (next ? 1 : -1));
    setError(null);

    startTransition(async () => {
      const res = await toggleFollow(authorId);
      if ("error" in res && res.error) {
        // ロールバック
        setFollowing(!next);
        setCount((c) => c + (next ? -1 : 1));
        setError(res.error);
        return;
      }
      if ("following" in res && typeof res.following === "boolean") {
        setFollowing(res.following);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors ${
          following
            ? "border border-gray-300 bg-white text-gray-700 hover:border-rose-200 hover:text-rose-600"
            : "bg-pink-500 text-white hover:bg-pink-600"
        } ${pending ? "opacity-70" : ""}`}
        aria-pressed={following}
      >
        {following ? (
          <>
            <UserCheck className="h-4 w-4" />
            フォロー中
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            フォローする
          </>
        )}
      </button>
      <span className="text-xs text-gray-500">{count.toLocaleString()} フォロワー</span>
      {error && <p className="ml-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
