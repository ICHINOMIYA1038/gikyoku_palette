"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { openInquiryThread } from "@/actions/threads";
import { Button } from "@/components/ui/button";

/**
 * 作家プロフィールに置く「メッセージを送る」ボタン。
 * クリックで inquiry スレッド（既存があれば再利用）を開いてその画面へ遷移。
 *
 * 自分自身（=作家本人がログインして自分のページを見ているケース）の場合は親側で非表示にする。
 */
export function ContactAuthorButton({ authorId }: { authorId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    const res = await openInquiryThread(authorId);
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if (res.threadId) {
      router.push(`/threads/${res.threadId}`);
    }
  };

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={handleClick}
        disabled={loading}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {loading ? "開いています..." : "メッセージを送る"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
